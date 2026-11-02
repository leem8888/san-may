import crypto from 'node:crypto';

// JourneyDirector: a journey is a story marked `journey: true` (stages = chapters; the StoryEngine already gives
// triggers, dialogue, world changes, rewards, checkpoints and resume after reload). This adds what a guided
// 20-minute experience needs on top: active play time per stage, pause/resume, remembering which stage
// introductions were seen, and privacy-first telemetry with simple statistics for the owner.
export const IDLE_GAP_MS = 90_000; // longer gaps between actions do not count as active time
export const ABANDON_MS = 3 * 24 * 3600_000;
export const playerKey = playerId => crypto.createHash('sha256').update(`sanmay-journey:${playerId}`).digest('hex').slice(0, 16);
const median = list => { if (!list.length) return null; const s = [...list].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

export function createJourney({ db, repos, content, clock = () => Date.now() }) {
  const insert = db.prepare('INSERT INTO journey_events (journey, player_key, event, stage, seconds, solo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const has = db.prepare('SELECT 1 FROM journey_events WHERE journey = ? AND player_key = ? AND event = ? AND (stage IS ? OR stage = ?) LIMIT 1').pluck();
  const active = new Map(); // playerId → { last, stage, total }
  const journeys = () => [...content.stories.values()].filter(s => s.journey);
  const record = (journey, playerId, event, { stage = null, seconds = null, solo = null } = {}, now = clock()) => insert.run(journey, playerKey(playerId), event, stage, seconds, solo === null ? null : solo ? 1 : 0, now);
  const paused = playerId => Boolean(repos.narrative.flags(playerId)['journey.paused']);

  return {
    // Called on movement and story events. Only time spent actually playing (gaps under 90 s) counts.
    touch(playerId, now = clock()) {
      if (paused(playerId)) { active.delete(playerId); return; }
      const a = active.get(playerId);
      if (!a) return active.set(playerId, { last: now, stage: 0, total: 0 });
      const gap = now - a.last;
      if (gap <= IDLE_GAP_MS) { a.stage += gap; a.total += gap; }
      a.last = now;
    },
    // After any story progress: start, stage completed, journey completed.
    observe(playerId, updates, now = clock()) {
      for (const u of updates) {
        const story = content.stories.get(u.storyId);
        if (!story?.journey || !u.chapterDone) continue;
        if (!has.get(story.id, playerKey(playerId), 'started', null, null)) record(story.id, playerId, 'started', {}, now);
        const a = active.get(playerId) || { stage: 0, total: 0 };
        record(story.id, playerId, 'stage_completed', { stage: u.chapterDone.n, seconds: Math.round(a.stage / 1000) }, now);
        a.stage = 0;
        if (u.chapterDone.n === story.chapters.length && !has.get(story.id, playerKey(playerId), 'completed', null, null)) {
          const first = db.prepare("SELECT MIN(created_at) FROM journey_events WHERE journey = ? AND player_key = ? AND event = 'started'").pluck().get(story.id, playerKey(playerId));
          const activeSeconds = db.prepare("SELECT COALESCE(SUM(seconds), 0) FROM journey_events WHERE journey = ? AND player_key = ? AND event = 'stage_completed'").pluck().get(story.id, playerKey(playerId));
          record(story.id, playerId, 'completed', { seconds: activeSeconds, stage: Math.round((now - first) / 1000) }, now);
        }
      }
    },
    // Cooperative activities (any kind): started / completed and whether it was solo. No content.
    coop(playerId, event, kind, solo, now = clock()) {
      const journey = journeys()[0];
      if (journey) insert.run(journey.id, playerKey(playerId), `coop_${event}:${kind}`, null, null, solo ? 1 : 0, now);
    },
    pause(playerId, on, now = clock()) { repos.narrative.setFlag(playerId, 'journey.paused', Boolean(on), now); if (on) active.delete(playerId); return Boolean(on); },
    seen(playerId, storyId, stage, now = clock()) { repos.narrative.setFlag(playerId, `journey.seen.${storyId}.${stage}`, true, now); },
    state(playerId) {
      const flags = repos.narrative.flags(playerId);
      return { paused: Boolean(flags['journey.paused']), seen: Object.keys(flags).filter(f => f.startsWith('journey.seen.') && flags[f]).map(f => f.slice(13)) };
    },
    // Owner statistics: where people stop, how long it takes, how many finish, how many play it with a friend.
    stats(journeyId = journeys()[0]?.id, now = clock()) {
      const story = content.stories.get(journeyId);
      if (!story) return null;
      const rows = db.prepare('SELECT player_key AS key, event, stage, seconds, solo, created_at AS at FROM journey_events WHERE journey = ? ORDER BY created_at').all(journeyId);
      const players = new Map();
      for (const r of rows) {
        const p = players.get(r.key) || { started: false, completed: null, stages: {}, last: 0, lampSolo: null };
        p.last = Math.max(p.last, r.at);
        if (r.event === 'started') p.started = true;
        if (r.event === 'stage_completed') p.stages[r.stage] = r.seconds;
        if (r.event === 'completed') p.completed = { active: r.seconds, wall: r.stage };
        if (r.event === 'coop_completed:lamp') p.lampSolo = r.solo === 1;
        players.set(r.key, p);
      }
      const all = [...players.values()].filter(p => p.started), done = all.filter(p => p.completed);
      const stages = story.chapters.map(c => ({ stage: c.n, title: c.title, reached: all.filter(p => p.stages[c.n] !== undefined).length, medianActiveMinutes: (m => m === null ? null : +(m / 60).toFixed(1))(median(all.map(p => p.stages[c.n]).filter(v => v !== undefined))) }));
      const abandoned = all.filter(p => !p.completed && now - p.last > ABANDON_MS);
      const stoppedAt = {};
      for (const p of abandoned) { const last = Math.max(0, ...Object.keys(p.stages).map(Number)); stoppedAt[last + 1] = (stoppedAt[last + 1] || 0) + 1; }
      const withLamp = done.filter(p => p.lampSolo !== null);
      return {
        journey: story.id, title: story.title, started: all.length, completed: done.length, inProgress: all.length - done.length - abandoned.length, abandoned: abandoned.length,
        completionRate: all.length ? +(done.length / all.length).toFixed(2) : null,
        medianActiveMinutes: (m => m === null ? null : +(m / 60).toFixed(1))(median(done.map(p => p.completed.active))),
        medianWallMinutes: (m => m === null ? null : +(m / 60).toFixed(1))(median(done.map(p => p.completed.wall))),
        withFriendRate: withLamp.length ? +(withLamp.filter(p => !p.lampSolo).length / withLamp.length).toFixed(2) : null,
        stages, abandonedBeforeStage: stoppedAt,
        note: 'Thời gian chủ động chỉ tính khoảng giữa hai thao tác dưới 90 giây. Đây là số đo thật từ người chơi, khác với thời lượng thiết kế 15–25 phút.',
      };
    },
  };
}
