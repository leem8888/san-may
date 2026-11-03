import crypto from 'node:crypto';
import { attachShop } from './shop.js';
import { createFishFeeding } from './fishFeeding.js';
import { attachWorldSync } from './world.js';
import { attachNarrative } from './narrative.js';
import { attachCoop } from './coop.js';
import { attachRestaurant } from './restaurant.js';
import { createCoop } from '../services/coop.js';
import { ACTIVITIES } from '../services/coopActivities.js';
import { stateKey } from '../services/worldState.js';
import { bowDirection } from '../../public/js/shared/rules.js';
import { validSandStrokes } from '../../public/js/shared/sand.js';
import { ACTIONS, COOLDOWNS, DURATIONS, EMOTES, GARDEN, INCENSE_SECONDS, ITEMS, LANTERN_STYLES, LIMITS, MEDITATION_MINUTES, REACTIONS, ROUND, SCENE_IDS, SPEED } from '../../public/js/shared/rules.js';
import { cleanText, isObject, number, oneOf, roomCode } from '../validators/index.js';
import { isOffensive, RateLimiter } from '../services/moderation.js';
import { publicPlayer, roomChannel, sceneChannel } from '../services/rooms.js';
import { insideRect } from '../services/world.js';
import { LOVE_FORTUNES } from '../content/loveFortunes.js';
import { LITTER_BINS } from '../../public/js/shared/litterBins.js';

export const LANTERN_LIFETIME = 10 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DIRECTIONS = ['up', 'down', 'left', 'right'];
const minutes = seconds => seconds >= 60 ? `${Math.round(seconds / 60)} phút` : `${seconds} giây`;
const reply = ack => typeof ack === 'function' ? ack : () => {};
const ACTIVITY_TEXT = {
  fortune: data => `Xin một quẻ ở Chánh Điện: ${cleanText(data?.title, 60) || 'quẻ không tên'}.`,
  sand: () => 'Cào một khu vườn cát.', sweep: () => 'Quét sạch lá trong sân chùa.', chant: () => 'Ngồi nghe tụng kinh trong Chánh Điện.',
  tea: data => `Pha và thưởng một chén trà${data?.tea ? ` ${cleanText(data.tea, 20)}` : ''}.`, stories: data => `Đọc “${cleanText(data?.title, 60) || 'một trang sách'}” ở Thư Viện.`,
};

/*
 * Event schema (client → server, all acknowledged unless noted):
 *   room:join {room}                       → {ok, self, room, scene, progress, meditation, serverNow}
 *   room:leave {}                          (no ack)
 *   player:move {sceneId, x, y, direction, state}   (no ack; server may answer player:correct)
 *   player:action {action}                 (no ack; broadcast as player:action)
 *   player:emote {emote}                   (no ack; broadcast as player:emote)
 *   player:portal {portalId}               → {ok, sceneId, x, y, scene}
 *   practice:complete {type: bow|bead}     → {ok, progress}
 *   bell:ring {objectId}                   → {ok, at}; broadcast bell:ring
 *   wish:create {text, visibility, clientId} → {ok, wish}; public ones broadcast as wish:new
 *   wish:react {wishId, emoji|null}        → {ok}; broadcast wish:reaction
 *   lantern:release {objectId, text, style, clientId} → {ok, lantern}; broadcast lantern:new
 *   meditation:start {minutes} / meditation:finish {} → session / result
 *   incense:light {objectId}               → {ok, stick}; room world state (censer/incense) → world:delta; burns INCENSE_SECONDS
 *   world:delta {id, scope, sceneId, objectId, type, value, version, expiresAt, removed?} (server → client); join/portal snapshots carry scene.world
 *   chat:send {text}                       → {ok}; broadcast chat:message {id, name, text, at} to the same area (not stored)
 *   activity:complete {objectId, title?, tea?} → {ok}; journal entry for sand/sweep/tea/stories/chant, proximity + 20 s rate limit
 *   sand:apply {objectId, strokes}          → {ok}; saves room sand and broadcasts sand:update {sceneId, strokes}
 *   shop:open {objectId}, shop:claim {objectId}, shop:buy {objectId, sku, requestId} → {ok, shop}
 *   shop:offer {objectId, sku}              → {ok, shop, offering}; broadcasts offering:update {sceneId, offerings}
 * Server → client: room:state {sceneId, t, full, players[]}, room:online, player:join, player:leave,
 *   player:update, player:correct, progress:events, meditation:ended, session:replaced.
 */
export function attachSockets(io, ctx) {
  const { repos, world, rooms, identity, progression, config } = ctx;
  const fishFeeding = createFishFeeding(ctx);
  const graceTimers = new Map();
  // Small, shared, temporary traces left by ambient visitors. No database writes.
  const litter = new Map(), lastLitterDrop = new Map();
  const litterKey = p => `${p.room}|${p.sceneId}`;
  const litterFor = p => litter.get(litterKey(p)) || [];
  const worldSync = attachWorldSync(io, ctx);
  let ticks = 0, closed = false;
  const toPlayer = (id, event, payload) => { const p = rooms.findPlayer(id); if (p) io.to(p.socketId).emit(event, payload); };
  // Cooperative sessions reuse the existing meditation, bell and action code through these hooks.
  ctx.coop = createCoop({ repos, world, rooms, worldState: ctx.worldState, progression, activities: ACTIVITIES, send: toPlayer, graceMs: config.disconnectGraceMs, telemetry: (id, event, kind, solo) => ctx.journey.coop(id, event, kind, solo), hooks: {
    startMeditation(p, chosen, now) {
      if (!p || p.meditation || repos.progression.activeMeditation(p.id)) return;
      const id = crypto.randomUUID();
      repos.progression.startMeditation(id, p.id, p.room, chosen * 60, now);
      p.meditation = { id, startedAt: now, plannedSeconds: chosen * 60, shared: true, together: true };
      Object.assign(p, { state: 'meditate', actionAt: now, moved: false, dirty: true });
      io.to(scene(p)).emit('player:action', { id: p.id, action: 'meditate', at: now });
      toPlayer(p.id, 'meditation:begin', { meditation: p.meditation, serverNow: now });
    },
    endMeditation(id, at) {
      const p = rooms.findPlayer(id);
      if (!p?.meditation) return;
      const result = finishMeditation(p, Math.min(Date.now(), at || Date.now()));
      if (result) { toPlayer(id, 'meditation:ended', result); io.to(scene(p)).emit('player:action', { id, action: 'idle', at: Date.now() }); }
    },
    ringBell(session, players) {
      const room = rooms.get(session.room), now = Date.now();
      if (!room) return;
      room.bells.set('bellTower|bigBell', now);
      io.to(sceneChannel(session.room, 'bellTower')).emit('bell:ring', { sceneId: 'bellTower', objectId: 'bigBell', at: now, by: players[0]?.id, name: players.map(p => p.name).join(' & '), together: true });
      for (const p of players) {
        Object.assign(p, { state: 'bell', actionAt: now, moved: false, dirty: true });
        repos.players.increment(p.id, 'bells_total', 1, now);
        const result = progression.record(p.id, [['bells', 1]], now);
        const s = io.sockets.sockets.get(p.socketId); if (s) notify(s, result);
      }
    },
    storyEvent(id, event) { ctx.storyHooks?.get(id)?.(event); },
    setAction(p, state) {
      if (!p) return;
      const now = Date.now();
      Object.assign(p, { state, actionAt: now, moved: false, dirty: true });
      io.to(scene(p)).emit('player:action', { id: p.id, action: state, at: now });
    },
  } });

  io.use((socket, next) => {
    const player = identity.authenticate(socket.handshake.auth?.token);
    if (!player) return next(new Error('unauthorized'));
    socket.data.playerId = player.id;
    next();
  });

  const scene = p => sceneChannel(p.room, p.sceneId);
  const baseScene = sceneId => sceneId.split(':')[0];

  function bellsFor(p) {
    const bells = {};
    for (const [key, at] of rooms.get(p.room)?.bells || []) { const [sceneId, id] = key.split('|'); if (sceneId === p.sceneId) bells[id] = at; }
    return bells;
  }
  const hasLanterns = sceneId => Boolean(world.map(sceneId)?.objects?.some(o => o.action === 'lantern'));
  // Incense is room-scoped world state: it survives a server restart and burns out after INCENSE_SECONDS.
  const incenseKey = p => stateKey('room', p.room, p.sceneId, 'censer', 'incense');
  const liveIncense = p => (ctx.worldState.value(incenseKey(p))?.sticks || []).filter(s => Date.now() - s.at < INCENSE_SECONDS * 1000);
  const gardenCode = sceneId => sceneId.startsWith('garden:') ? sceneId.slice(7) : null;
  function gardenSnapshot(code) {
    const garden = code && repos.gardens.byCode(code);
    return garden ? { code, ownerId: garden.ownerId, ownerName: garden.ownerName, objects: repos.gardens.objects(garden.ownerId) } : null;
  }
  const snapshot = p => ({
    sceneId: p.sceneId,
    litter: litterFor(p),
    restaurant: p.sceneId === 'gate' ? ctx.restaurant.snapshot(p.room) : null,
    offerings: p.sceneId === 'mainHall' ? repos.shop.offerings(p.room) : [],
    fishFeed: fishFeeding.snapshot(p),
    sand: p.sceneId === 'zenGarden' ? repos.content.roomSand(p.room) : null,
    players: rooms.inScene(p.room, p.sceneId).filter(other => other !== p).map(other => publicPlayer(other)),
    bells: bellsFor(p),
    lanterns: hasLanterns(p.sceneId) ? repos.content.lanterns(p.room, Date.now() - LANTERN_LIFETIME) : [],
    incense: liveIncense(p),
    garden: gardenSnapshot(gardenCode(p.sceneId)),
    world: worldSync.snapshot(p),
  });

  function notify(socket, result) {
    if (result.quests.length || result.achievements.length) socket.emit('progress:events', { quests: result.quests, achievements: result.achievements, progress: result.progress });
    return result.progress;
  }

  function visit(p) {
    const id = baseScene(p.sceneId), progress = repos.players.progress(p.id);
    if (SCENE_IDS.includes(id) && !progress.scenesVisited.includes(id)) repos.players.saveVisited(p.id, [...progress.scenesVisited, id]);
    return progression.record(p.id, [[`visit:${id}`, 1]]);
  }

  function finishMeditation(p, now = Date.now()) {
    const session = repos.progression.activeMeditation(p.id);
    if (!session) return null;
    const actual = Math.max(0, Math.min(session.planned_seconds, Math.round((now - session.started_at) / 1000)));
    const shared = Boolean(p.meditation?.shared);
    if (!repos.progression.finishMeditation(session.id, actual, shared, now)) return null;
    const together = p.meditation?.together;
    p.meditation = null;
    // Ending a shared sit early is fine: the session ends gently, the partner keeps sitting on their own.
    const coopSession = together && ctx.coop.sessionOf(p.id);
    if (coopSession?.kind === 'meditate' && coopSession.status === 'active' && !coopSession.data.ending) ctx.coop.leave(p, `${p.name} đã kết thúc thiền sớm. Bạn cứ ngồi tiếp nếu muốn.`);
    if (p.state === 'meditate') { p.state = 'idle'; p.actionAt = now; p.dirty = true; }
    repos.players.increment(p.id, 'meditation_seconds', actual);
    const completed = actual >= session.planned_seconds - 1, unlocked = [];
    if (completed) unlocked.push(progression.unlock(p.id, 'meditation-first', now));
    if (shared && actual >= 60) unlocked.push(progression.unlock(p.id, 'shared-meditation', now));
    if (actual >= 30) progression.journal(p.id, `Thiền ${minutes(actual)}${completed ? ', trọn vẹn' : ''}${shared ? ', cùng bạn đồng tu' : ''}.`, now);
    const result = progression.record(p.id, [['meditation_seconds', actual]], now);
    return { actualSeconds: actual, plannedSeconds: session.planned_seconds, completed, shared, progress: result.progress, quests: result.quests, achievements: [...unlocked.filter(Boolean), ...result.achievements] };
  }

  function scheduleGrace(p, leftAt) {
    clearTimeout(graceTimers.get(p.id));
    if (closed) return;
    // A reload within the grace period resumes the session instead of cutting it short.
    const timer = setTimeout(() => { graceTimers.delete(p.id); if (!rooms.findPlayer(p.id)) finishMeditation(p, leftAt); }, config.disconnectGraceMs);
    timer.unref(); graceTimers.set(p.id, timer);
  }

  io.on('connection', socket => {
    const playerId = socket.data.playerId;
    const limiter = new RateLimiter(40, 30);
    let self = null, dropped = 0;
    attachShop(socket, ctx, () => self);
    fishFeeding.attach(socket, () => self);
    const story = attachNarrative(socket, ctx, () => self);
    attachCoop(socket, ctx, () => self, limiter);
    attachRestaurant(socket, ctx, () => self);

    socket.on('error', () => {});
    socket.use(([event, ...args], next) => {
      if (limiter.take('all')) {
        if (self?.meditation && !['room:join', 'room:leave', 'player:move', 'player:action', 'player:emote', 'chat:send', 'meditation:start', 'meditation:finish', 'player:recover', 'coop:state', 'coop:leave', 'coop:respond', 'coop:memories'].includes(event)) {
          const ack = args.at(-1);
          if (typeof ack === 'function') ack({ error: 'Bạn đang thiền. Hãy bấm Kết thúc thiền trước khi làm việc khác.' });
          return;
        }
        return next();
      }
      if (++dropped > 120) socket.disconnect(true);
      next(new Error(`rate limited: ${event}`));
    });

    function leave(reason) {
      const p = self;
      if (!p) return;
      if (p.litterCarried && world.walkable(p.sceneId, p.x, p.y)) {
        const key = litterKey(p), items = litterFor(p);
        if (items.length < 8) {
          const item = { id: crypto.randomUUID(), x: Math.round(p.x), y: Math.round(p.y), kind: p.litterCarried, sceneId: p.sceneId };
          litter.set(key, [...items, item]); io.to(scene(p)).emit('litter:spawn', item);
        }
      }
      ctx.restaurant.leave(p);
      self = null;
      socket.leave(roomChannel(p.room)); socket.leave(scene(p));
      if (!rooms.remove(p)) return;
      ctx.restaurant.roomEmpty(p.room);
      const now = Date.now();
      socket.to(scene(p)).emit('player:leave', { id: p.id, reason });
      io.to(roomChannel(p.room)).emit('room:online', { online: rooms.get(p.room)?.players.size || 0 });
      repos.rooms.recordLeave(p.historyId, now);
      repos.players.saveLocation(p.id, p.sceneId, p.x, p.y, now);
      ctx.coop.away(p.id);
      if (p.meditation) scheduleGrace(p, now);
    }

    function changeScene(p, sceneId, position) {
      ctx.restaurant.leave(p);
      socket.to(scene(p)).emit('player:leave', { id: p.id, reason: 'scene' });
      socket.leave(scene(p));
      Object.assign(p, { sceneId, x: position.x, y: position.y, state: 'idle', actionAt: Date.now(), moved: true, dirty: true, locationDirty: true });
      socket.join(scene(p));
      socket.to(scene(p)).emit('player:join', publicPlayer(p));
      repos.players.saveLocation(p.id, p.sceneId, p.x, p.y);
      ctx.coop.sceneChanged(p);
    }

    socket.on('room:join', (data, ack) => {
      ack = reply(ack);
      const code = config.fixedRoomCode || roomCode(data?.room);
      if (!code) return ack({ error: 'Mã phòng không hợp lệ.' });
      const stored = repos.rooms.get(code), live = rooms.get(code);
      if (live && live.players.size >= config.maxPlayersPerRoom && !live.players.has(playerId)) return ack({ error: `Phòng đã đủ ${config.maxPlayersPerRoom} người.` });
      leave('room-change');
      const previous = rooms.findPlayer(playerId);
      if (previous) {
        // One live avatar per guest: the newest tab wins, the old one is told why it stopped.
        const old = io.sockets.sockets.get(previous.socketId);
        old?.emit('session:replaced'); old?.disconnect(true);
        rooms.remove(previous);
      }
      const room = rooms.ensure(code, Boolean(stored?.isPrivate));
      const now = Date.now(), profile = repos.players.profile(playerId), saved = repos.players.progress(playerId);
      const sceneId = saved.lastScene && world.has(saved.lastScene) ? saved.lastScene : (world.has('gate') ? 'gate' : world.ids[0]);
      const position = saved.lastScene === sceneId && world.walkable(sceneId, saved.lastX, saved.lastY) ? { x: saved.lastX, y: saved.lastY } : world.spawn(sceneId);
      repos.players.saveLocation(playerId, sceneId, position.x, position.y, now);
      self = {
        id: playerId, socketId: socket.id, room: code, name: profile.name, appearance: profile.appearance, sceneId, ...position,
        footwear: profile.footwear,
        direction: 'down', state: 'idle', actionAt: now, moved: false, lastMoveAt: now, dirty: true, locationDirty: false,
        historyId: repos.rooms.recordJoin(code, playerId, now), meditation: null, lastWishAt: 0, lastLanternAt: 0, lastEmoteAt: 0, lastChatAt: 0, lastIncenseAt: 0, recent: new Map(), activities: new Map(),
      };
      room.players.set(playerId, self);
      socket.join(roomChannel(code)); socket.join(scene(self));
      let meditation = null, meditationResult = null;
      const session = repos.progression.activeMeditation(playerId);
      if (session) {
        clearTimeout(graceTimers.get(playerId)); graceTimers.delete(playerId);
        const end = session.started_at + session.planned_seconds * 1000;
        if (now >= end) meditationResult = finishMeditation(self, end);
        else {
          self.meditation = { id: session.id, startedAt: session.started_at, plannedSeconds: session.planned_seconds, shared: false };
          Object.assign(self, { state: 'meditate', actionAt: session.started_at });
          meditation = self.meditation;
        }
      }
      const first = progression.unlock(playerId, 'first-visit', now);
      const visited = visit(self);
      if (first) visited.achievements.unshift(first);
      notify(socket, visited);
      socket.to(scene(self)).emit('player:join', publicPlayer(self));
      io.to(roomChannel(code)).emit('room:online', { online: room.players.size });
      ack({ ok: true, self: publicPlayer(self), room: { code, private: room.isPrivate, online: room.players.size, capacity: config.maxPlayersPerRoom }, scene: snapshot(self), progress: repos.players.progress(playerId), meditation, meditationResult, story: story.state(), coop: ctx.coop.back(self), practice: repos.practice.current(playerId, 'bow'), serverNow: now });
    });

    socket.on('room:leave', () => leave('left'));
    socket.on('disconnect', () => leave('disconnect'));

    socket.on('litter:drop', (data, ack) => {
      ack = reply(ack);
      const p = self, now = Date.now();
      if (!p || p.meditation || !isObject(data) || data.sceneId !== p.sceneId || !Number.isInteger(data.botId) || data.botId < 0 || data.botId > 15 || !['paper', 'leaf', 'wrapper'].includes(data.kind)) return ack({ error: 'Không thể làm rơi rác.' });
      const map = world.map(p.sceneId), x = data.x, y = data.y;
      if (!map || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > map.width || y > map.height || !world.walkable(p.sceneId, x, y)) return ack({ error: 'Vị trí rác không hợp lệ.' });
      const key = litterKey(p), items = litterFor(p);
      if (items.length >= 8 || now - (lastLitterDrop.get(key) || 0) < 12000) return ack({ error: 'Khu này đã đủ sạch.' });
      const item = { id: crypto.randomUUID(), x, y, kind: data.kind, sceneId: p.sceneId };
      litter.set(key, [...items, item]); lastLitterDrop.set(key, now);
      io.to(scene(p)).emit('litter:spawn', item);
      ack({ ok: true, item });
    });

    socket.on('litter:pick', (data, ack) => {
      ack = reply(ack);
      const p = self;
      if (!p || p.meditation || p.sweeping || p.restaurantSeat || typeof data?.id !== 'string') return ack({ error: 'Bạn chưa thể nhặt rác lúc này.' });
      if (p.litterCarried) return ack({ error: 'Hãy bỏ món rác đang cầm vào thùng trước.' });
      const key = litterKey(p), items = litterFor(p), item = items.find(o => o.id === data.id);
      if (!item) return ack({ error: 'Rác đã được nhặt rồi.' });
      if (Math.hypot(p.x - item.x, p.y - item.y) > 68) return ack({ error: 'Hãy đến gần rác hơn.' });
      litter.set(key, items.filter(o => o.id !== item.id));
      p.litterCarried = item.kind; p.dirty = true;
      io.to(scene(p)).emit('litter:removed', { sceneId: p.sceneId, id: item.id });
      ack({ ok: true, carried: item.kind });
    });

    socket.on('litter:deposit', (_data, ack) => {
      ack = reply(ack);
      const p = self, bin = p && LITTER_BINS[p.sceneId];
      if (!p || !bin || !p.litterCarried) return ack({ error: 'Bạn chưa cầm rác để bỏ vào thùng.' });
      if (p.meditation || p.sweeping || p.restaurantSeat || Math.hypot(p.x - bin.x, p.y - bin.y) > 74) return ack({ error: 'Hãy đến gần thùng rác hơn.' });
      p.litterCarried = null; p.dirty = true;
      ack({ ok: true });
    });

    socket.on('player:move', data => {
      const p = self;
      if (!p || !isObject(data) || data.sceneId !== p.sceneId) return;
      if (p.meditation || p.sweeping) {
        p.lastMoveAt = Date.now();
        if (data.x !== p.x || data.y !== p.y || data.direction !== p.direction) socket.emit('player:correct', { sceneId: p.sceneId, x: p.x, y: p.y, direction: p.direction });
        return;
      }
      // A map update can put an old saved position inside a new obstacle.
      // Recover on the server so clients are never corrected back into that obstacle.
      if (!world.walkable(p.sceneId, p.x, p.y)) {
        const safe = world.spawn(p.sceneId);
        Object.assign(p, safe, { state: 'idle', actionAt: Date.now(), lastMoveAt: Date.now(), moved: true, dirty: true, locationDirty: true });
        repos.players.saveLocation(p.id, p.sceneId, p.x, p.y);
        return socket.emit('player:correct', { sceneId: p.sceneId, x: p.x, y: p.y });
      }
      const map = world.map(p.sceneId), x = number(data.x, 0, map.width), y = number(data.y, 0, map.height);
      if (x === null || y === null) return;
      const now = Date.now(), dt = Math.min(1, (now - p.lastMoveAt) / 1000), distance = Math.hypot(x - p.x, y - p.y);
      // Accept a little slack for jitter; anything faster than walking speed or inside an obstacle is corrected.
      if (distance > SPEED * dt * 1.3 + 24 || !world.walkable(p.sceneId, x, y)) {
        p.lastMoveAt = now;
        return socket.emit('player:correct', { sceneId: p.sceneId, x: p.x, y: p.y });
      }
      p.lastMoveAt = now;
      p.direction = oneOf(data.direction, DIRECTIONS, p.direction);
      if (p.restaurantSeat) {
        // Leaving a restaurant seat is an explicit action; ignore stale or stray movement packets.
        if (distance > 1) socket.emit('player:correct', { sceneId: p.sceneId, x: p.x, y: p.y, direction: p.direction });
        return;
      }
      if (distance > 1) {
        ctx.restaurant.leave(p);
        Object.assign(p, { x, y, moved: true, locationDirty: true });
        if (now - (p.journeyTouch || 0) > 5000) { p.journeyTouch = now; ctx.journey.touch(p.id, now); }
        if (p.meditation) { const result = finishMeditation(p, now); if (result) socket.emit('meditation:ended', result); }
        if (p.state !== 'walk') { p.state = 'walk'; p.actionAt = now; }
      } else if (data.state === 'idle' && p.state === 'walk') { p.state = 'idle'; p.actionAt = now; }
      p.direction = bowDirection(p.sceneId, p.state, p.direction);
      p.dirty = true;
    });

    socket.on('player:action', data => {
      const p = self, action = oneOf(data?.action, ACTIONS);
      if (!p || !action || ['walk', 'meditate', 'bell', 'sweep'].includes(action)) return;
      if (p.meditation || p.sweeping) return;
      const now = Date.now();
      Object.assign(p, { state: action, actionAt: now, moved: false, dirty: true });
      p.direction = bowDirection(p.sceneId, action, p.direction);
      socket.to(scene(p)).emit('player:action', { id: p.id, action, at: now, direction: p.direction });
    });

    socket.on('player:emote', data => {
      const p = self, emote = oneOf(data?.emote, EMOTES), now = Date.now();
      if (!p || !emote || now - p.lastEmoteAt < COOLDOWNS.emote) return;
      p.lastEmoteAt = now;
      io.to(scene(p)).emit('player:emote', { id: p.id, emote, at: now });
    });

    // Speech bubbles for people in the same area. Realtime only: chat is never written to the database.
    socket.on('chat:send', (data, ack) => {
      ack = reply(ack);
      const p = self, text = cleanText(data?.text, LIMITS.chat), now = Date.now();
      if (!p) return ack({ error: 'Hãy vào phòng trước.' });
      if (!text) return ack({ error: 'Tin nhắn trống.' });
      if (isOffensive(text)) return ack({ error: 'Tin nhắn có từ ngữ chưa phù hợp.' });
      if (now - p.lastChatAt < COOLDOWNS.chat) return ack({ error: 'Chậm lại một chút nhé.' });
      p.lastChatAt = now;
      io.to(scene(p)).emit('chat:message', { id: p.id, name: p.name, text, at: now });
      ack({ ok: true, text });
    });

    socket.on('incense:light', (data, ack) => {
      ack = reply(ack);
      const p = self, censer = p && world.object(p.sceneId, data?.objectId);
      if (!censer || censer.action !== 'incense') return ack({ error: 'Không tìm thấy lư hương.' });
      if (Math.hypot(p.x - censer.x, p.y - censer.y) > censer.radius + 40) return ack({ error: 'Hãy đến gần lư hương hơn.' });
      const now = Date.now();
      if (now - p.lastIncenseAt < COOLDOWNS.incense) return ack({ error: 'Nén hương của bạn vẫn đang cháy. Hãy đợi một lát.' });
      p.lastIncenseAt = now;
      const stick = { id: crypto.randomUUID(), playerId: p.id, name: p.name, at: now };
      ctx.worldState.update(incenseKey(p), current => ({ sticks: [...(current?.sticks || []).filter(s => now - s.at < INCENSE_SECONDS * 1000), stick].slice(-12) }), { ttlMs: INCENSE_SECONDS * 1000 });
      Object.assign(p, { state: 'pray', actionAt: now, moved: false, dirty: true });
      progression.journal(p.id, 'Thắp một nén hương ở Chánh Điện.', now);
      ack({ ok: true, stick, progress: notify(socket, progression.record(p.id, [['incense', 1]], now)) });
    });

    // practice:session {action: start|pause|resume|end, type: 'bow', target: 9|27|54|108} → {ok, session}
    socket.on('practice:session', (data, ack) => {
      ack = reply(ack);
      const p = self, type = oneOf(data?.type, ['bow']), action = oneOf(data?.action, ['start', 'pause', 'resume', 'end']);
      if (!p || !type || !action) return ack({ error: 'Dữ liệu không hợp lệ.' });
      const now = Date.now(), current = repos.practice.current(p.id, type);
      if (action === 'start') {
        const target = [9, 27, 54, 108].includes(data.target) ? data.target : null;
        if (!target) return ack({ error: 'Hãy chọn 9, 27, 54 hoặc 108 lần.' });
        if (current) repos.practice.setStatus(current.id, 'ended', now);
        return ack({ ok: true, session: repos.practice.start(crypto.randomUUID(), p.id, type, target, now) });
      }
      if (!current) return ack({ error: 'Không có phiên lạy nào đang mở.' });
      const status = { pause: 'paused', resume: 'active', end: 'ended' }[action];
      const session = repos.practice.setStatus(current.id, status, now);
      if (action === 'end' && session.done > 0) progression.journal(p.id, `Lạy ${session.done} lần (phiên ${session.target}), dừng lại khi thấy đủ.`, now);
      ack({ ok: true, session });
    });

    socket.on('practice:complete', (data, ack) => {
      ack = reply(ack);
      const p = self, type = oneOf(data?.type, ['bow', 'bead']);
      if (!p || !type) return ack({ error: 'Dữ liệu không hợp lệ.' });
      const now = Date.now(), progress = repos.players.progress(p.id), round = type === 'bow' ? 'bowsRound' : 'beadsRound';
      // A count is only valid after the full animation time since the server saw the action start, without moving.
      if (p.state !== type || p.moved || now - p.actionAt < DURATIONS[type] * 1000 - 300) return ack({ error: 'Lần này chưa được tính vì hành động chưa trọn.', progress });
      Object.assign(p, { state: 'idle', actionAt: now, dirty: true });
      if (progress[round] >= ROUND) return ack({ error: 'Vòng này đã đủ 108. Hãy bắt đầu vòng mới.', progress });
      const next = progress[round] + 1;
      repos.players.setRounds(p.id, type === 'bow' ? next : progress.bowsRound, type === 'bead' ? next : progress.beadsRound, now);
      repos.players.increment(p.id, `${type}s_total`, 1, now);
      if (next === ROUND) { repos.players.increment(p.id, `${type}_rounds`, 1, now); progression.journal(p.id, type === 'bow' ? 'Hoàn thành một vòng 108 lần lạy.' : 'Lần trọn một chuỗi 108 hạt.', now); }
      const result = progression.record(p.id, [[`${type}s`, 1]], now);
      // A running session counts only bows the server accepted above (full animation, standing still).
      const open = repos.practice.current(p.id, type), session = (open?.status === 'active' ? repos.practice.count(open.id, now) : open) ?? null;
      if (session?.status === 'completed') progression.journal(p.id, `Hoàn thành phiên lạy ${session.target} lần.`, now);
      ack({ ok: true, progress: notify(socket, result), session });
    });

    socket.on('bell:ring', (data, ack) => {
      ack = reply(ack);
      const p = self, bell = p && world.object(p.sceneId, data?.objectId);
      if (!bell || bell.action !== 'bell') return ack({ error: 'Không tìm thấy chuông.' });
      if (Math.hypot(p.x - bell.x, p.y - bell.y) > bell.radius + 40) return ack({ error: 'Hãy đến gần chuông hơn.' });
      const room = rooms.get(p.room), key = `${p.sceneId}|${bell.id}`, now = Date.now(), last = room.bells.get(key) || 0;
      if (now - last < (COOLDOWNS[bell.cooldown] || COOLDOWNS.bell)) return ack({ error: 'Chuông vẫn đang ngân, hãy đợi một chút.', at: last });
      room.bells.set(key, now);
      Object.assign(p, { state: 'bell', actionAt: now, moved: false, dirty: true });
      io.to(scene(p)).emit('bell:ring', { sceneId: p.sceneId, objectId: bell.id, at: now, by: p.id, name: p.name });
      repos.players.increment(p.id, 'bells_total', 1, now);
      ack({ ok: true, at: now, progress: notify(socket, progression.record(p.id, [['bells', 1]], now)) });
    });

    socket.on('wish:create', (data, ack) => {
      ack = reply(ack);
      const p = self;
      if (!p || !isObject(data)) return ack({ error: 'Hãy vào phòng trước.' });
      const clientId = typeof data.clientId === 'string' ? data.clientId.slice(0, 64) : '';
      if (clientId && p.recent.has(clientId)) return ack({ ok: true, duplicate: true, wish: p.recent.get(clientId) });
      // The Main Hall prayer book shares this path: kind "prayer", longer text, private unless chosen otherwise.
      const kind = oneOf(data.kind, ['wish', 'prayer'], 'wish');
      const text = cleanText(data.text, kind === 'prayer' ? LIMITS.prayer : LIMITS.wish), visibility = oneOf(data.visibility, ['public', 'private'], kind === 'prayer' ? 'private' : 'public'), now = Date.now();
      if (!text) return ack({ error: 'Lời chúc không được để trống.' });
      if (isOffensive(text)) return ack({ error: 'Lời chúc có từ ngữ chưa phù hợp. Hãy viết lại nhẹ nhàng hơn.' });
      if (now - p.lastWishAt < COOLDOWNS.wish) return ack({ error: 'Vui lòng chờ 5 giây giữa hai lời chúc.' });
      const wish = { id: crypto.randomUUID(), room: p.room, playerId: p.id, name: p.name, text, visibility, kind, createdAt: now };
      repos.content.insertWish(wish);
      repos.players.increment(p.id, 'wishes_total', 1, now);
      p.lastWishAt = now;
      const out = { id: wish.id, playerId: p.id, name: p.name, text, visibility, kind, createdAt: now, reactions: {}, mine: null };
      if (clientId) { p.recent.set(clientId, out); if (p.recent.size > 20) p.recent.delete(p.recent.keys().next().value); }
      if (visibility === 'public') socket.to(roomChannel(p.room)).emit('wish:new', out);
      if (kind === 'prayer') { progression.journal(p.id, visibility === 'private' ? 'Viết một lời nguyện riêng vào sổ cầu nguyện.' : 'Viết một lời nguyện vào sổ cầu nguyện của Chánh Điện.', now); return ack({ ok: true, wish: out }); }
      ack({ ok: true, wish: out, progress: notify(socket, progression.record(p.id, [['wishes', 1]], now)) });
    });

    socket.on('wish:react', (data, ack) => {
      ack = reply(ack);
      const p = self, wish = p && typeof data?.wishId === 'string' ? repos.content.wish(data.wishId) : null;
      // null removes a reaction; anything outside the list is rejected (undefined).
      const emoji = data?.emoji === null ? null : REACTIONS.includes(data?.emoji) ? data.emoji : undefined;
      if (!wish || wish.hidden || wish.room !== p.room || wish.visibility !== 'public' || emoji === undefined) return ack({ error: 'Không thể bày tỏ cảm xúc cho lời chúc này.' });
      if (!limiter.take('react', 4)) return ack({ error: 'Chậm lại một chút nhé.' });
      repos.content.react(wish.id, p.id, emoji);
      const reactions = repos.content.reactions(wish.id);
      io.to(roomChannel(p.room)).emit('wish:reaction', { wishId: wish.id, reactions });
      ack({ ok: true, reactions, mine: emoji });
    });

    socket.on('lantern:release', (data, ack) => {
      ack = reply(ack);
      const p = self, dock = p && world.object(p.sceneId, data?.objectId);
      if (!dock || dock.action !== 'lantern') return ack({ error: 'Hãy đến bến thả hoa đăng.' });
      if (Math.hypot(p.x - dock.x, p.y - dock.y) > dock.radius + 40) return ack({ error: 'Hãy đến gần mép nước hơn.' });
      const clientId = typeof data.clientId === 'string' ? data.clientId.slice(0, 64) : '';
      if (clientId && p.recent.has(clientId)) return ack({ ok: true, duplicate: true, lantern: p.recent.get(clientId) });
      const text = cleanText(data.text, LIMITS.lantern), style = oneOf(data.style, LANTERN_STYLES, 'lotus'), now = Date.now();
      if (!text) return ack({ error: 'Hãy viết một điều ước cho hoa đăng.' });
      if (isOffensive(text)) return ack({ error: 'Điều ước có từ ngữ chưa phù hợp.' });
      if (now - p.lastLanternAt < COOLDOWNS.lantern) return ack({ error: 'Hãy đợi hoa đăng trước trôi xa một chút.' });
      const lantern = { id: crypto.randomUUID(), room: p.room, playerId: p.id, name: p.name, text, style, createdAt: now };
      repos.content.insertLantern(lantern);
      repos.players.increment(p.id, 'lanterns_total', 1, now);
      progression.journal(p.id, `Thả hoa đăng: “${text}”`, now);
      p.lastLanternAt = now;
      const out = { id: lantern.id, playerId: p.id, name: p.name, text, style, createdAt: now };
      if (clientId) p.recent.set(clientId, out);
      socket.to(scene(p)).emit('lantern:new', out);
      ack({ ok: true, lantern: out, progress: notify(socket, progression.record(p.id, [['lanterns', 1]], now)) });
    });

    // Mini-games run in the browser; the server only records them next to the right object and at a human pace.
    socket.on('activity:complete', (data, ack) => {
      ack = reply(ack);
      const p = self, o = p && world.object(p.sceneId, data?.objectId);
      if (!o || !ACTIVITY_TEXT[o.action]) return ack({ error: 'Không có hoạt động ở đây.' });
      if (Math.hypot(p.x - o.x, p.y - o.y) > o.radius + 60) return ack({ error: 'Hãy quay lại gần chỗ đó.' });
      const now = Date.now();
      if (now - (p.activities.get(o.action) || 0) < 20000) return ack({ ok: true, repeated: true });
      p.activities.set(o.action, now);
      progression.journal(p.id, ACTIVITY_TEXT[o.action](data), now);
      story.handle({ type: 'activity', activity: o.action, scene: p.sceneId });
      ack({ ok: true, progress: notify(socket, progression.record(p.id, [[`activity:${o.action}`, 1]], now)) });
    });

    socket.on('sand:apply', (data, ack) => {
      ack = reply(ack);
      const p = self, o = p && world.object(p.sceneId, data?.objectId);
      if (!o || o.action !== 'sand' || p.sceneId !== 'zenGarden') return ack({ error: 'Hãy đến vườn cát để vẽ.' });
      if (Math.hypot(p.x - o.x, p.y - o.y) > o.radius + 60) return ack({ error: 'Hãy đến gần vườn cát.' });
      if (!validSandStrokes(data?.strokes)) return ack({ error: 'Nét vẽ không hợp lệ hoặc quá nhiều điểm.' });
      if (Date.now() - (p.lastSandAt || 0) < 2000) return ack({ error: 'Chờ một chút trước khi đổi vườn cát nhé.' });
      p.lastSandAt = Date.now();
      repos.content.saveRoomSand(p.room, data.strokes);
      io.to(scene(p)).emit('sand:update', { sceneId: p.sceneId, strokes: data.strokes });
      ack({ ok: true });
    });

    socket.on('player:portal', (data, ack) => {
      ack = reply(ack);
      const p = self, portal = p && world.portal(p.sceneId, data?.portalId);
      if (!portal) return ack({ error: 'Lối đi không tồn tại.' });
      if (p.sweeping) return ack({ error: 'Hãy kết thúc quét sân trước khi đi.' });
      if (!insideRect(portal, p.x, p.y, 48)) return ack({ error: 'Hãy đi tới lối chuyển khu vực.', x: p.x, y: p.y });
      let footwear = p.footwear;
      if (portal.to === 'mainHall') footwear = 'stored';
      else if (p.sceneId === 'mainHall' || !['mainHall', 'courtyard'].includes(portal.to)) footwear = 'wearing';
      const footwearChanged = footwear !== p.footwear;
      if (footwearChanged) {
        repos.players.setFootwear(p.id, footwear); p.footwear = footwear; p.appearance.footwear = footwear;
      }
      if (p.meditation) { const result = finishMeditation(p); if (result) socket.emit('meditation:ended', result); }
      changeScene(p, portal.to, world.spawn(portal.to, portal.spawn));
      const result = visit(p);
      story.handle({ type: 'visit', scene: p.sceneId });
      notify(socket, result);
      ack({ ok: true, self: publicPlayer(p), scene: snapshot(p), footwearChanged: footwearChanged ? footwear : null });
    });

    // Recovery works from any scene or animation, including a broken render loop.
    socket.on('player:recover', (data, ack) => {
      ack = reply(ack);
      const p = self;
      if (!p) return ack({ error: 'Hãy vào trò chơi trước.' });
      if (p.meditation) { const result = finishMeditation(p); if (result) socket.emit('meditation:ended', result); }
      p.sweeping = false;
      if (p.footwear !== 'wearing') {
        repos.players.setFootwear(p.id, 'wearing'); p.footwear = 'wearing'; p.appearance.footwear = 'wearing';
      }
      changeScene(p, 'gate', world.spawn('gate'));
      ack({ ok: true, self: publicPlayer(p), scene: snapshot(p) });
    });

    socket.on('footwear:toggle', (data, ack) => {
      ack = reply(ack);
      const p = self, rack = p && world.object(p.sceneId, data?.objectId);
      if (!rack || rack.action !== 'footwear' || Math.hypot(p.x - rack.x, p.y - rack.y) > rack.radius) return ack({ error: 'Hãy đến kệ dép trước Chánh Điện.' });
      const next = p.footwear === 'stored' ? 'wearing' : 'stored';
      repos.players.setFootwear(p.id, next); p.footwear = next; p.appearance.footwear = next;
      io.to(scene(p)).emit('player:update', { id: p.id, appearance: p.appearance });
      ack({ ok: true, footwear: next });
    });

    socket.on('character:shave', (data, ack) => {
      ack = reply(ack);
      const p = self, npc = p && world.object(p.sceneId, data?.objectId);
      if (!npc || npc.action !== 'shave' || Math.hypot(p.x - npc.x, p.y - npc.y) > npc.radius) return ack({ error: 'Hãy gặp thầy hướng dẫn trong sân chùa.' });
      const profile = repos.players.profile(p.id);
      if (!profile.gender) return ack({ error: 'Hãy chọn Nam hoặc Nữ trước.' });
      if (repos.players.shave(p.id)) progression.journal(p.id, 'Quyết định cạo đầu và bắt đầu một chặng tu học.', Date.now());
      p.appearance = repos.players.profile(p.id).appearance;
      io.to(scene(p)).emit('player:update', { id: p.id, appearance: p.appearance });
      ack({ ok: true, appearance: p.appearance });
    });

    socket.on('love:draw', (data, ack) => {
      ack = reply(ack);
      const p = self, table = p && world.object(p.sceneId, data?.objectId);
      if (!table || table.action !== 'loveFortune' || Math.hypot(p.x - table.x, p.y - table.y) > table.radius) return ack({ error: 'Hãy đến bàn cầu duyên trong sân chùa.' });
      const now = Date.now();
      if (now - (p.lastLoveDrawAt || 0) < 30000) return ack({ error: 'Hãy chờ một chút trước khi rút thẻ tiếp.' });
      const card = LOVE_FORTUNES[crypto.randomInt(LOVE_FORTUNES.length)];
      p.lastLoveDrawAt = now; p.lastLoveCard = card;
      socket.to(scene(p)).emit('player:action', { id: p.id, action: 'pray', at: now });
      ack({ ok: true, card });
    });

    socket.on('love:save', (data, ack) => {
      ack = reply(ack);
      const p = self, card = p?.lastLoveCard;
      if (!card || data?.id !== card.id) return ack({ error: 'Hãy rút thẻ trước khi lưu.' });
      if (!p.lastLoveCard) return ack({ error: 'Thẻ đã được lưu.' });
      progression.journal(p.id, `Thẻ cầu duyên ${card.id} · ${card.title}: ${card.text}`);
      p.lastLoveCard = null;
      ack({ ok: true });
    });

    socket.on('sweep:state', (data, ack) => {
      ack = reply(ack);
      const p = self, broom = p && world.object(p.sceneId, data?.objectId);
      if (!broom || broom.action !== 'sweep' || Math.hypot(p.x - broom.x, p.y - broom.y) > broom.radius) return ack({ error: 'Hãy đến chỗ quét sân.' });
      if (typeof data.active !== 'boolean') return ack({ error: 'Trạng thái không hợp lệ.' });
      p.sweeping = data.active;
      const now = Date.now();
      Object.assign(p, { state: p.sweeping ? 'sweep' : 'idle', actionAt: now, moved: false, dirty: true });
      io.to(scene(p)).emit('player:action', { id: p.id, action: p.state, at: now });
      ack({ ok: true });
    });

    // ── Personal gardens: one scene per garden (`garden:<code>`); only the owner may change it. ──
    function ownGarden(p) { const garden = p && gardenCode(p.sceneId) && repos.gardens.byCode(gardenCode(p.sceneId)); return garden && garden.ownerId === p.id ? garden : null; }
    function placeable(garden, x, y, ignoreId) {
      const plot = world.map('garden').plot;
      if (x === null || y === null || x < plot.x || x > plot.x + plot.w || y < plot.y || y > plot.y + plot.h) return 'Hãy đặt bên trong khu đất của vườn.';
      if (repos.gardens.objects(garden.ownerId).some(o => o.id !== ignoreId && Math.hypot(o.x - x, o.y - y) < GARDEN.spacing)) return 'Chỗ này chật quá, hãy chọn chỗ thoáng hơn.';
      return null;
    }
    const gardenChanged = (p, garden) => io.to(scene(p)).emit('garden:update', { sceneId: p.sceneId, objects: repos.gardens.objects(garden.ownerId) });

    socket.on('garden:enter', (data, ack) => {
      ack = reply(ack);
      const p = self;
      if (!p) return ack({ error: 'Hãy vào phòng trước.' });
      const gate = world.map(p.sceneId)?.objects?.find(o => o.action === 'garden');
      if (!gardenCode(p.sceneId) && (!gate || Math.hypot(p.x - gate.x, p.y - gate.y) > gate.radius + 40)) return ack({ error: 'Hãy đến cổng vườn riêng ở Vườn Thiền.' });
      let code = typeof data?.code === 'string' ? data.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) : '';
      if (code && !repos.gardens.byCode(code)) return ack({ error: 'Không tìm thấy khu vườn với mã này.' });
      if (!code) {
        code = repos.gardens.byOwner(p.id)?.code;
        if (!code) { code = Array.from(crypto.randomBytes(8), byte => CODE_ALPHABET[byte % 32]).join(''); repos.gardens.create(p.id, code, `Vườn của ${p.name}`); }
      }
      if (p.meditation) { const result = finishMeditation(p); if (result) socket.emit('meditation:ended', result); }
      changeScene(p, `garden:${code}`, world.spawn('garden'));
      ack({ ok: true, self: publicPlayer(p), scene: snapshot(p) });
    });

    socket.on('garden:place', (data, ack) => {
      ack = reply(ack);
      const p = self, garden = ownGarden(p), itemId = `decor:${data?.type}`, item = ITEMS[itemId];
      if (!garden) return ack({ error: 'Chỉ chủ vườn mới được sắp đặt khu vườn.' });
      if (!item || item.kind !== 'decor' || (!item.default && !repos.players.items(p.id).has(itemId))) return ack({ error: 'Bạn chưa có vật phẩm này.' });
      if (repos.gardens.objects(p.id).length >= GARDEN.maxObjects) return ack({ error: `Vườn đã có ${GARDEN.maxObjects} vật. Hãy cất bớt một vật.` });
      const x = number(data.x, 0, 2000), y = number(data.y, 0, 2000), problem = placeable(garden, x, y);
      if (problem) return ack({ error: problem });
      if (!limiter.take('garden', 6)) return ack({ error: 'Chậm lại một chút nhé.' });
      const now = Date.now();
      repos.gardens.add(crypto.randomUUID(), p.id, data.type, Math.round(x), Math.round(y), now);
      let progress = null;
      if (data.type === 'tree') {
        repos.players.increment(p.id, 'trees_planted', 1, now);
        progression.journal(p.id, 'Gieo một hạt cây mới trong vườn riêng.', now);
        progress = notify(socket, progression.record(p.id, [['plant', 1]], now));
      }
      gardenChanged(p, garden);
      ack({ ok: true, progress });
    });

    socket.on('garden:move', (data, ack) => {
      ack = reply(ack);
      const p = self, garden = ownGarden(p);
      if (!garden || !repos.gardens.object(data?.id, p.id)) return ack({ error: 'Chỉ chủ vườn mới được di chuyển vật này.' });
      const x = number(data.x, 0, 2000), y = number(data.y, 0, 2000), problem = placeable(garden, x, y, data.id);
      if (problem) return ack({ error: problem });
      repos.gardens.move(data.id, p.id, Math.round(x), Math.round(y));
      gardenChanged(p, garden); ack({ ok: true });
    });

    socket.on('garden:remove', (data, ack) => {
      ack = reply(ack);
      const p = self, garden = ownGarden(p);
      if (!garden || !repos.gardens.remove(data?.id, p.id)) return ack({ error: 'Chỉ chủ vườn mới được cất vật này.' });
      gardenChanged(p, garden); ack({ ok: true });
    });

    socket.on('garden:water', (data, ack) => {
      ack = reply(ack);
      const p = self, garden = ownGarden(p), tree = garden && repos.gardens.object(data?.id, p.id);
      if (!tree || tree.type !== 'tree') return ack({ error: 'Chỉ chủ vườn mới tưới được cây này.' });
      if (Math.hypot(p.x - tree.x, p.y - tree.y) > 140) return ack({ error: 'Hãy đến gần cây hơn để tưới.' });
      const now = Date.now(), wait = (tree.lastWateredAt || 0) + GARDEN.waterCooldown - now;
      if (wait > 0) return ack({ error: `Đất còn ẩm. Khoảng ${Math.ceil(wait / 60000)} phút nữa hãy tưới tiếp.` });
      repos.gardens.water(tree.id, p.id, now);
      repos.players.increment(p.id, 'trees_watered', 1, now);
      progression.journal(p.id, 'Tưới cây trong vườn riêng.', now);
      gardenChanged(p, garden);
      ack({ ok: true, progress: notify(socket, progression.record(p.id, [['water', 1]], now)) });
    });

    socket.on('meditation:start', (data, ack) => {
      ack = reply(ack);
      const p = self, chosen = MEDITATION_MINUTES.includes(data?.minutes) ? data.minutes : null;
      if (!p || !chosen) return ack({ error: 'Hãy chọn thời lượng thiền hợp lệ.' });
      if (p.meditation || repos.progression.activeMeditation(p.id)) return ack({ error: 'Bạn đang trong một phiên thiền.' });
      const now = Date.now(), id = crypto.randomUUID();
      repos.progression.startMeditation(id, p.id, p.room, chosen * 60, now);
      p.meditation = { id, startedAt: now, plannedSeconds: chosen * 60, shared: false };
      Object.assign(p, { state: 'meditate', actionAt: now, moved: false, dirty: true });
      socket.to(scene(p)).emit('player:action', { id: p.id, action: 'meditate', at: now });
      ack({ ok: true, meditation: p.meditation, serverNow: now });
    });

    socket.on('meditation:finish', (data, ack) => {
      ack = reply(ack);
      if (!self) return ack({ error: 'Hãy vào phòng trước.' });
      const result = finishMeditation(self);
      if (!result) return ack({ error: 'Không có phiên thiền đang diễn ra.' });
      socket.to(scene(self)).emit('player:action', { id: self.id, action: 'idle', at: Date.now() });
      ack({ ok: true, ...result });
    });
  });

  // 10 Hz snapshots per scene; every second a reliable full keyframe repairs any dropped volatile update.
  const timer = setInterval(() => {
    const now = Date.now(), full = ++ticks % 10 === 0, persist = ticks % 50 === 0;
    if (full) ctx.coop.sweep(now);
    for (const room of rooms.rooms.values()) {
      const byScene = new Map(), meditating = new Map();
      const add = (map, key, value) => { if (!map.has(key)) map.set(key, []); map.get(key).push(value); };
      for (const p of room.players.values()) {
        if (p.meditation) add(meditating, p.sceneId, p);
        if (persist && p.locationDirty) { repos.players.saveLocation(p.id, p.sceneId, p.x, p.y, now); p.locationDirty = false; }
        if (!full && !p.dirty) continue;
        p.dirty = false;
        add(byScene, p.sceneId, publicPlayer(p, now));
      }
      for (const group of meditating.values()) if (group.length > 1) for (const p of group) p.meditation.shared = true;
      for (const [sceneId, players] of byScene) {
        const target = io.to(sceneChannel(room.code, sceneId));
        (full ? target : target.volatile).emit('room:state', { sceneId, t: now, full, players });
      }
    }
  }, config.tickMs);
  timer.unref();

  return { close() { closed = true; worldSync.close(); ctx.restaurant.close(); clearInterval(timer); for (const t of graceTimers.values()) clearTimeout(t); graceTimers.clear(); } };
}
