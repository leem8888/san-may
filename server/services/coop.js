import crypto from 'node:crypto';
import { stateKey } from './worldState.js';

// Two-person (and a few solo-capable) activities. A session lives in memory while it runs:
//   invited → gathering (walk to the place, mark ready) → active (server-checked steps) → completed | cancelled
//   invited → declined | expired.
// Every step is validated here and in the activity's own rules; clients only ask. Node runs each request to
// completion, so two people acting "at the same moment" are simply applied one after the other.
export const LIMITS = { inviteMs: 60_000, inviteCooldownMs: 6_000, declineBlockMs: 60_000 };
export const NEAR = 80;
const LIVE = new Set(['invited', 'gathering', 'active']);

export function near(p, world, sceneId, objectId, extra = NEAR) {
  if (!p || p.sceneId !== sceneId) return false;
  const o = world.object(sceneId, objectId);
  return Boolean(o) && Math.hypot(p.x - o.x, p.y - o.y) <= (o.radius || 90) + extra;
}

export function createCoop({ repos, world, rooms, worldState, progression, activities, hooks = {}, send = () => {}, telemetry = () => {}, clock = () => Date.now(), graceMs = 30_000 }) {
  const sessions = new Map(), byPlayer = new Map(), lastInvite = new Map(), declines = new Map();
  const live = id => rooms.findPlayer(id);
  const participants = s => [s.hostId, s.guestId].filter(Boolean);
  const partnerOf = (s, id) => id === s.hostId ? s.guestId : s.hostId;
  const fail = message => { throw Object.assign(Error(message), { coop: true }); };

  function context(s) {
    return { now: clock(), world, worldState, repos, progression, hooks, rooms, live, send, participants: participants(s), partnerOf: id => partnerOf(s, id), complete: result => complete(s, result), update: () => publish(s) };
  }
  function view(s, forId) {
    const activity = activities[s.kind], partnerId = partnerOf(s, forId), host = forId === s.hostId;
    return {
      id: s.id, kind: s.kind, title: activity.title, status: s.status, host, solo: !s.guestId,
      role: s.guestId ? activity.roles?.[host ? 'host' : 'guest'] || null : null, partner: partnerId ? { id: partnerId, name: s.names[partnerId], away: Boolean(s.away[partnerId]) } : null,
      sceneId: s.sceneId, objectId: s.objectId, place: activity.place || null, step: s.step, expiresAt: s.expiresAt,
      ready: { me: Boolean(s.ready[forId]), partner: Boolean(partnerId && s.ready[partnerId]) }, needsReady: !activity.autoStart && !activity.instant,
      guide: s.status === 'gathering' ? (activity.gatherGuide?.(s, forId) || `Đến ${activity.place || 'nơi hẹn'} rồi bấm “Sẵn sàng”.`) : s.status === 'active' ? activity.guide(s, forId) : null,
      actions: s.status === 'active' ? activity.actions(s, forId) : [], options: s.status === 'gathering' ? activity.options?.(s, forId) || null : null,
      data: activity.view?.(s, forId) || {}, result: s.result, reason: s.reason || null,
    };
  }
  function publish(s) {
    for (const id of participants(s)) send(id, 'coop:state', view(s, id));
    const activity = activities[s.kind];
    // Others in the area see the activity happen (steam over the tea table, two people at the bell).
    if (activity.scene && activity.publicView) {
      const key = stateKey('room', s.room, activity.scene, s.objectId, 'coop');
      if (LIVE.has(s.status) && s.status !== 'invited') worldState.set(key, activity.publicView(s), { ttlMs: 30 * 60_000 });
      else if (worldState.get(key)) worldState.remove(key);
    }
  }
  function persist(s) {
    repos.coop.save({ id: s.id, room: s.room, kind: s.kind, hostId: s.hostId, guestId: s.guestId, status: s.status, result: s.result || (s.reason ? { reason: s.reason } : {}), createdAt: s.createdAt, startedAt: s.startedAt, endedAt: s.endedAt });
  }
  function close(s, status, reason) {
    if (!LIVE.has(s.status)) return s;
    Object.assign(s, { status, reason: reason || null, endedAt: clock() });
    for (const id of participants(s)) if (byPlayer.get(id) === s.id) byPlayer.delete(id);
    sessions.delete(s.id);
    persist(s); publish(s);
    return s;
  }
  function complete(s, result = {}) {
    if (s.status !== 'active') return s;
    const activity = activities[s.kind], now = clock();
    s.result = result;
    const unlocked = {};
    for (const id of participants(s)) {
      if (activity.achievement) unlocked[id] = progression.unlock(id, activity.achievement, now);
      const text = activity.memory?.(s, id);
      if (text) progression.journal(id, text, now);
      s.memoryText = { ...s.memoryText, [id]: text };
    }
    close(s, 'completed');
    for (const id of participants(s)) {
      const text = s.memoryText[id];
      if (text) repos.coop.remember(crypto.randomUUID(), s.id, id, s.guestId ? s.names[partnerOf(s, id)] : null, s.kind, text, now);
      telemetry(id, 'completed', s.kind, !s.guestId);
      hooks.storyEvent?.(id, { type: 'coop', kind: s.kind });
      send(id, 'coop:complete', { id: s.id, kind: s.kind, title: activity.title, memory: text || null, achievement: unlocked[id] || null, moment: activity.moment || null, result });
    }
    return s;
  }
  function start(s) {
    Object.assign(s, { status: 'active', startedAt: clock() });
    for (const id of participants(s)) telemetry(id, 'started', s.kind, !s.guestId);
    activities[s.kind].start(s, context(s)); // may read what each person chose when marking ready
    s.ready = {};
    if (s.status === 'active') publish(s);
  }
  const sessionOf = id => sessions.get(byPlayer.get(id)) || null;
  function own(p) { const s = sessionOf(p.id); if (!s) fail('Bạn không có phiên cùng chơi nào.'); return s; }

  return {
    sessionOf, view,
    invite(p, targetId, kind, options = {}) {
      const activity = activities[kind], now = clock();
      if (!activity) fail('Hoạt động không tồn tại.');
      if (sessionOf(p.id)) fail('Bạn đang có một phiên cùng chơi. Hãy kết thúc nó trước.');
      if (now - (lastInvite.get(p.id) || 0) < LIMITS.inviteCooldownMs) fail('Chờ một chút rồi mời lại nhé.');
      let target = null;
      if (targetId) {
        target = rooms.get(p.room)?.players.get(targetId);
        if (!target || targetId === p.id) fail('Người này không còn trong phòng.');
        if (sessionOf(target.id)) fail(`${target.name} đang bận một hoạt động khác.`);
        if (repos.players.blocks(target.id).includes(p.id) || repos.players.blocks(p.id).includes(target.id)) fail('Không thể mời người này.');
        if ((declines.get(`${target.id}|${p.id}`) || 0) > now) fail(`${target.name} vừa từ chối. Hãy để lần sau nhé.`);
      } else if (!activity.solo) fail('Hoạt động này cần hai người. Hãy mời một người bạn.');
      activity.canInvite?.(p, target, { world, repos, options, fail });
      lastInvite.set(p.id, now);
      const s = {
        id: crypto.randomUUID(), room: p.room, kind, sceneId: activity.scene || p.sceneId, objectId: activity.objectFor?.(p, options, world) || activity.object || null,
        hostId: p.id, guestId: target?.id || null, names: { [p.id]: p.name, ...(target ? { [target.id]: target.name } : {}) },
        status: target ? 'invited' : 'gathering', createdAt: now, expiresAt: now + LIMITS.inviteMs, startedAt: null, endedAt: null,
        step: null, data: { options: activity.cleanOptions?.(options) || {} }, ready: {}, away: {}, result: null,
      };
      sessions.set(s.id, s); byPlayer.set(p.id, s.id);
      if (target) {
        byPlayer.set(target.id, s.id);
        send(target.id, 'coop:invite', { id: s.id, kind, title: activity.title, from: { id: p.id, name: p.name }, role: activity.roles?.guest || null, place: activity.place || null, note: activity.inviteNote?.(s) || null, expiresAt: s.expiresAt });
      }
      if (!target && activity.autoStart) start(s); else publish(s);
      return view(s, p.id);
    },
    respond(p, sessionId, accept) {
      const s = sessions.get(sessionId);
      if (!s || s.guestId !== p.id || s.status !== 'invited') fail('Lời mời không còn hiệu lực.');
      if (!accept) { declines.set(`${p.id}|${s.hostId}`, clock() + LIMITS.declineBlockMs); close(s, 'declined', `${p.name} đã từ chối lời mời.`); return null; }
      const activity = activities[s.kind];
      s.status = 'gathering';
      if (activity.instant) {
        const host = live(s.hostId);
        if (!host) { close(s, 'cancelled', 'Người mời đã rời đi.'); fail('Người mời đã rời đi.'); }
        activity.canInvite?.(host, p, { world, options: s.data.options, fail: message => { close(s, 'cancelled', message); fail(message); } });
        s.status = 'active'; s.startedAt = clock();
        activity.start(s, context(s));
        complete(s, {});
        return view(s, p.id);
      }
      if (activity.autoStart) start(s); else publish(s);
      return view(s, p.id);
    },
    ready(p, options = {}) {
      const s = own(p), activity = activities[s.kind];
      if (s.status !== 'gathering') fail('Phiên này không ở bước chuẩn bị.');
      activity.checkReady?.(s, p, options, { world, fail });
      s.ready[p.id] = activity.readyValue?.(options) ?? true;
      const all = participants(s);
      if (all.length === (s.guestId ? 2 : 1) && all.every(id => s.ready[id])) {
        const mismatch = activity.agree?.(s);
        if (mismatch) { publish(s); return { ...view(s, p.id), notice: mismatch }; }
        // Activities that can happen in several places need both people in the same one.
        if (activity.agreePlace && new Set(all.map(id => live(id)?.sceneId)).size > 1) { s.ready = {}; publish(s); return { ...view(s, p.id), notice: 'Hai bạn đang ở hai khu khác nhau. Hãy ngồi cùng một nơi.' }; }
        if (activity.agreePlace) s.sceneId = live(s.hostId).sceneId;
        // Everyone must still be in place at the moment it starts.
        for (const id of all) activity.checkReady?.(s, live(id), s.ready[id] === true ? {} : s.ready[id], { world, fail: message => { delete s.ready[id]; publish(s); fail(id === p.id ? message : `${s.names[id]} chưa tới nơi.`); } });
        start(s);
      } else publish(s);
      return view(s, p.id);
    },
    unready(p) { const s = own(p); if (s.status === 'gathering') { delete s.ready[p.id]; publish(s); } return view(s, p.id); },
    act(p, action, payload = {}) {
      const s = own(p), activity = activities[s.kind];
      if (s.status !== 'active') fail('Hoạt động chưa bắt đầu.');
      if (s.guestId && s.away[partnerOf(s, p.id)]) fail(`Đợi ${s.names[partnerOf(s, p.id)]} kết nối lại một chút.`);
      const out = activity.act(s, p, String(action), payload || {}, { ...context(s), fail }) || {};
      if (LIVE.has(s.status)) publish(s);
      return { ...out, session: s.status === 'completed' ? null : view(s, p.id) };
    },
    leave(p, reason) {
      const s = sessionOf(p.id);
      if (!s) return null;
      const activity = activities[s.kind];
      if (s.status === 'active') activity.onLeave?.(s, p.id, context(s));
      close(s, 'cancelled', reason || (s.guestId ? `${p.name} đã rời phiên.` : 'Bạn đã dừng.'));
      return null;
    },
    // Disconnects pause the session for `graceMs`; a reload in time resumes it where it was.
    away(playerId) {
      const s = sessionOf(playerId);
      if (!s) return;
      if (s.status === 'invited' && s.hostId === playerId) return close(s, 'cancelled', 'Người mời đã rời đi.');
      s.away[playerId] = clock() + graceMs; publish(s);
    },
    back(p) {
      const s = sessionOf(p.id);
      if (!s) return null;
      if (s.room !== p.room) { close(s, 'cancelled', `${p.name} đã sang phòng khác.`); return null; }
      delete s.away[p.id]; publish(s);
      if (s.status === 'invited' && s.guestId === p.id) send(p.id, 'coop:invite', { id: s.id, kind: s.kind, title: activities[s.kind].title, from: { id: s.hostId, name: s.names[s.hostId] }, role: activities[s.kind].roles?.guest || null, place: activities[s.kind].place || null, expiresAt: s.expiresAt });
      return view(s, p.id);
    },
    // Leaving the area during an activity that happens in one place ends it gently for both.
    sceneChanged(p) {
      const s = sessionOf(p.id), activity = s && activities[s.kind];
      if (s?.status === 'active' && activity.stay && p.sceneId !== s.sceneId) { activity.onLeave?.(s, p.id, context(s)); close(s, 'cancelled', `${p.name} đã rời ${activity.place || 'khu vực'}.`); }
    },
    sweep(now = clock()) {
      for (const s of [...sessions.values()]) {
        if (s.status === 'invited' && now >= s.expiresAt) { close(s, 'expired', 'Lời mời đã hết hạn.'); continue; }
        const gone = Object.entries(s.away).find(([, until]) => now >= until);
        if (gone) { if (s.status === 'active') activities[s.kind].onLeave?.(s, gone[0], context(s)); close(s, 'cancelled', `${s.names[gone[0]]} đã mất kết nối.`); continue; }
        if (s.status === 'active') activities[s.kind].tick?.(s, context(s), now);
      }
    },
    refresh: s => { if (LIVE.has(s.status)) publish(s); },
    memories: playerId => repos.coop.memories(playerId),
    size: () => sessions.size,
  };
}
