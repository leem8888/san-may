// Story progress, story flags, remembered dialogue choices and NPC relationships, all per player.
export function createNarrativeRepo(db) {
  const s = {
    progress: db.prepare('SELECT story_id AS storyId, chapter, step, status, started_at AS startedAt, updated_at AS updatedAt, completed_at AS completedAt FROM story_progress WHERE player_id = ?'),
    saveProgress: db.prepare(`INSERT INTO story_progress (player_id, story_id, chapter, step, status, started_at, updated_at, completed_at)
      VALUES (@playerId, @storyId, @chapter, @step, @status, @now, @now, @completedAt)
      ON CONFLICT(player_id, story_id) DO UPDATE SET chapter = excluded.chapter, step = excluded.step, status = excluded.status, updated_at = excluded.updated_at, completed_at = excluded.completed_at`),
    flags: db.prepare('SELECT flag, value FROM story_flags WHERE player_id = ?'),
    setFlag: db.prepare(`INSERT INTO story_flags (player_id, flag, value, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(player_id, flag) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`),
    choices: db.prepare('SELECT npc_id AS npcId, choice_key AS key, value FROM dialogue_choices WHERE player_id = ?'),
    choose: db.prepare(`INSERT INTO dialogue_choices (player_id, npc_id, choice_key, value, created_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, npc_id, choice_key) DO UPDATE SET value = excluded.value, created_at = excluded.created_at`),
    relation: db.prepare('SELECT npc_id AS npcId, met_at AS metAt, talks, familiarity, last_talk_day AS lastTalkDay, activities FROM npc_relationships WHERE player_id = ? AND npc_id = ?'),
    relations: db.prepare('SELECT npc_id AS npcId, met_at AS metAt, talks, familiarity, last_talk_day AS lastTalkDay, activities FROM npc_relationships WHERE player_id = ?'),
    meet: db.prepare('INSERT OR IGNORE INTO npc_relationships (player_id, npc_id, met_at) VALUES (?, ?, ?)'),
    talk: db.prepare('UPDATE npc_relationships SET talks = talks + 1, familiarity = MIN(?, familiarity + ?), last_talk_day = ? WHERE player_id = ? AND npc_id = ?'),
    activity: db.prepare('UPDATE npc_relationships SET activities = ?, familiarity = MIN(?, familiarity + 1) WHERE player_id = ? AND npc_id = ?'),
    log: db.prepare('INSERT INTO story_log (player_id, story_id, chapter, text, created_at) VALUES (?, ?, ?, ?, ?)'),
    logs: db.prepare('SELECT story_id AS storyId, chapter, text, created_at AS createdAt FROM story_log WHERE player_id = ? ORDER BY id'),
  };
  const parse = row => row && { ...row, activities: JSON.parse(row.activities) };
  return {
    progress: playerId => Object.fromEntries(s.progress.all(playerId).map(row => [row.storyId, row])),
    saveProgress: (playerId, storyId, chapter, step, status, now = Date.now()) => s.saveProgress.run({ playerId, storyId, chapter, step, status, now, completedAt: status === 'completed' ? now : null }),
    flags: playerId => Object.fromEntries(s.flags.all(playerId).map(row => [row.flag, JSON.parse(row.value)])),
    setFlag: (playerId, flag, value, now = Date.now()) => s.setFlag.run(playerId, flag, JSON.stringify(value), now),
    choices: playerId => { const out = {}; for (const row of s.choices.all(playerId)) (out[row.npcId] ||= {})[row.key] = JSON.parse(row.value); return out; },
    choose: (playerId, npcId, key, value, now = Date.now()) => s.choose.run(playerId, npcId, key, JSON.stringify(value), now),
    relation: (playerId, npcId) => parse(s.relation.get(playerId, npcId)),
    relations: playerId => Object.fromEntries(s.relations.all(playerId).map(row => [row.npcId, parse(row)])),
    meet: (playerId, npcId, now = Date.now()) => s.meet.run(playerId, npcId, now).changes > 0,
    talk: (playerId, npcId, day, gain, cap) => s.talk.run(cap, gain, day, playerId, npcId),
    addActivity(playerId, npcId, activity, cap) {
      const row = this.relation(playerId, npcId);
      if (!row || row.activities.includes(activity)) return false;
      s.activity.run(JSON.stringify([...row.activities, activity]), cap, playerId, npcId);
      return true;
    },
    log: (playerId, storyId, chapter, text, now = Date.now()) => s.log.run(playerId, storyId, chapter, text, now),
    logs: playerId => s.logs.all(playerId),
    transaction: fn => db.transaction(fn)(),
  };
}
