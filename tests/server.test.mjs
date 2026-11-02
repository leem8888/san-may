import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/database/db.js';
import { periodKeys } from '../server/services/progression.js';
import { ask, connect, delay, guest, nextEvent, startServer, walk } from './helpers.mjs';

test('REST: static files, guest identity, profile validation and HTTP errors', async t => {
  const s = await startServer(); t.after(s.close);
  for (const file of ['/', '/js/main.js', '/css/main.css', '/js/core/Game.js', '/data/dialogues.json', '/js/shared/rules.js', '/data/maps/courtyard.json', '/socket.io/socket.io.esm.min.js']) assert.equal((await s.http('GET', file)).status, 200, file);
  for (const file of ['/server.js', '/server/index.js', '/package.json', '/node_modules/express/package.json', '/data/sanmay.db', '/js/../../server.js']) assert.equal((await s.http('GET', file)).status, 404, file);
  assert.match((await s.http('GET', '/')).headers.get('content-security-policy'), /script-src 'self'/);

  const created = await s.http('POST', '/api/guest', { name: 'An <b>' });
  assert.equal(created.status, 201);
  assert.match(created.data.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(created.data.player.name, 'An b');
  assert.equal(created.data.player.progress.bowsRound, 0);
  const token = created.data.token;
  const stored = s.game.db.prepare('SELECT token_hash FROM players').pluck().all();
  assert.ok(stored.length === 1 && stored[0] !== token && stored[0].length === 64, 'only a hash of the token is stored');
  assert.equal((await s.http('GET', '/api/me', undefined, 'x'.repeat(43))).status, 401);
  assert.equal((await s.http('GET', '/api/me')).status, 401);

  const profile = await s.http('PUT', '/api/profile', { name: 'Bình', appearance: { accessory: 'hat', outfitColor: '#8ba59b', hairStyle: 'nope' } }, token);
  assert.equal(profile.data.player.name, 'Bình');
  assert.deepEqual(profile.data.player.appearance, { hairStyle: 'short', hairColor: '#2b2823', outfitStyle: 'robe', outfitColor: '#8ba59b', accessory: 'none' }, 'locked and unknown items fall back to defaults');
  assert.equal((await s.http('PUT', '/api/profile', { name: 'đm' }, token)).status, 400);
  assert.equal((await s.http('PUT', '/api/profile', '{bad json', token)).status, 400);
  assert.equal((await s.http('PUT', '/api/profile', { name: 'x'.repeat(40000) }, token)).status, 413);
  assert.equal((await s.http('POST', '/api/progress/restart', { type: 'bow' }, token)).status, 409);

  const privateRoom = await s.http('POST', '/api/rooms', { private: true }, token);
  assert.match(privateRoom.data.code, /^P-[A-HJ-NP-Z2-9]{10}$/);
  assert.equal((await s.http('GET', `/api/rooms/${privateRoom.data.code}`)).data.private, true);
  assert.equal((await s.http('GET', '/api/rooms/MAY-01')).data.private, false);
  assert.equal((await s.http('GET', '/api/rooms/!!')).status, 400);
});

test('Socket: players see each other, movement is validated, actions sync and rooms are isolated', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game, 'An'), b = guest(s.game, 'Bình'), c = guest(s.game, 'Chi');
  const [sa, sb, sc] = await Promise.all([a, b, c].map(g => connect(s.base, g.token)));
  t.after(() => [sa, sb, sc].forEach(socket => socket.close()));
  const ja = await ask(sa, 'room:join', { room: 'TEST' });
  assert.equal(ja.ok, true); assert.equal(ja.room.online, 1); assert.equal(ja.progress.bowsRound, 0);
  const joined = nextEvent(sa, 'player:join', p => p.id === b.id);
  const jb = await ask(sb, 'room:join', { room: 'test' });
  assert.equal(jb.room.code, 'TEST');
  assert.deepEqual(jb.scene.players.map(p => p.id), [a.id]);
  assert.equal((await joined).name, 'Bình');
  const jc = await ask(sc, 'room:join', { room: 'OTHER' });
  assert.equal(jc.scene.players.length, 0, 'other rooms are isolated');
  assert.equal((await ask(sa, 'room:join', { room: '!' })).error, 'Mã phòng không hợp lệ.');
  assert.equal((await ask(sa, 'room:join', { room: 'TEST' })).ok, true, 'rejoining the same room is allowed');

  const from = { x: ja.self.x, y: ja.self.y }, to = { x: from.x + 70, y: from.y };
  const seen = nextEvent(sb, 'room:state', state => state.players.some(p => p.id === a.id && Math.abs(p.x - to.x) < 1));
  await walk(sa, ja.self.sceneId, from, to);
  await seen;
  const correction = nextEvent(sa, 'player:correct');
  sa.emit('player:move', { sceneId: ja.self.sceneId, x: to.x + 600, y: to.y, direction: 'right', state: 'walk' });
  assert.equal((await correction).x, to.x, 'teleports are corrected to the last valid position');
  sa.emit('player:move', { sceneId: 'library', x: 10, y: 10 });

  const action = nextEvent(sb, 'player:action', data => data.id === a.id);
  sa.emit('player:action', { action: 'wave' });
  assert.equal((await action).action, 'wave');
  sa.emit('player:action', { action: 'fly' });
  const emote = nextEvent(sb, 'player:emote');
  sa.emit('player:emote', { emote: 'lotus' });
  assert.deepEqual([(await emote).id, (await emote).emote], [a.id, 'lotus']);
  let leaked = false; sc.on('player:emote', () => { leaked = true; });

  const left = nextEvent(sb, 'player:leave', data => data.id === a.id), online = nextEvent(sb, 'room:online');
  sa.disconnect();
  await left;
  assert.equal((await online).online, 1);
  assert.equal(leaked, false);
  assert.equal(s.game.ctx.rooms.get('TEST').players.has(a.id), false, 'disconnected players are removed from the room');
});

test('Socket: practice counts only completed actions and progress survives a reconnect', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game, 'An');
  let socket = await connect(s.base, a.token); t.after(() => socket.close());
  const join = await ask(socket, 'room:join', { room: 'PRACTICE' });
  socket.emit('player:action', { action: 'bead' });
  assert.match((await ask(socket, 'practice:complete', { type: 'bead' })).error, /chưa trọn/);
  await delay(700);
  const done = await ask(socket, 'practice:complete', { type: 'bead' });
  assert.equal(done.ok, true); assert.equal(done.progress.beadsRound, 1);
  assert.match((await ask(socket, 'practice:complete', { type: 'bead' })).error, /chưa trọn/, 'one action counts once');
  socket.emit('player:action', { action: 'bead' });
  const to = { x: join.self.x + 30, y: join.self.y };
  await walk(socket, join.self.sceneId, join.self, to);
  await delay(650);
  assert.match((await ask(socket, 'practice:complete', { type: 'bead' })).error, /chưa trọn/, 'moving cancels the action');

  socket.close();
  await delay(80);
  socket = await connect(s.base, a.token);
  const again = await ask(socket, 'room:join', { room: 'PRACTICE' });
  assert.equal(again.progress.beadsRound, 1, 'progress is restored from SQLite');
  assert.equal(again.progress.beadsTotal, 1);
  assert.deepEqual([again.self.sceneId, again.self.x, again.self.y], [join.self.sceneId, to.x, to.y], 'last position is restored');
  assert.equal((await s.http('GET', '/api/me', undefined, a.token)).data.player.progress.beadsRound, 1);
});

test('Socket: wishes persist, dedupe, rate limit, moderation, privacy, reactions, reports and quests', async t => {
  const s = await startServer(); t.after(s.close);
  const people = ['An', 'Bình', 'Chi', 'Dũng'].map(name => guest(s.game, name));
  const sockets = await Promise.all(people.map(p => connect(s.base, p.token)));
  t.after(() => sockets.forEach(socket => socket.close()));
  for (const socket of sockets) await ask(socket, 'room:join', { room: 'WISH' });
  const [sa, sb, sc] = sockets, [a, b, c, d] = people;

  const events = nextEvent(sa, 'progress:events');
  const incoming = nextEvent(sb, 'wish:new');
  const first = await ask(sa, 'wish:create', { text: 'Bình an <script>', visibility: 'public', clientId: 'w1' });
  assert.equal(first.ok, true); assert.equal(first.wish.text, 'Bình an script');
  assert.equal((await incoming).id, first.wish.id);
  const unlocked = await events;
  assert.ok(unlocked.achievements.some(x => x.id === 'wish-first'));
  assert.ok(unlocked.quests.some(x => x.id === 'd-wish'));
  assert.equal((await ask(sa, 'wish:create', { text: 'Bình an <script>', clientId: 'w1' })).duplicate, true);
  assert.match((await ask(sa, 'wish:create', { text: 'Lời thứ hai', clientId: 'w2' })).error, /5 giây/);
  assert.match((await ask(sb, 'wish:create', { text: 'vcl thật', clientId: 'w3' })).error, /chưa phù hợp/);
  assert.match((await ask(sb, 'wish:create', { text: '   ' })).error, /trống/);

  let leaked = false; sb.on('wish:new', () => { leaked = true; });
  const secret = await ask(sc, 'wish:create', { text: 'Điều riêng tư', visibility: 'private', clientId: 'p1' });
  await delay(150);
  assert.equal(leaked, false, 'private wishes are not broadcast');
  assert.equal(s.game.db.prepare('SELECT COUNT(*) FROM wishes').pluck().get(), 2, 'wishes are stored in SQLite');
  const forB = (await s.http('GET', '/api/wishes?room=WISH', undefined, b.token)).data.wishes;
  const forC = (await s.http('GET', '/api/wishes?room=WISH', undefined, c.token)).data.wishes;
  assert.deepEqual(forB.map(w => w.id), [first.wish.id]);
  assert.deepEqual(forC.map(w => w.id).sort(), [first.wish.id, secret.wish.id].sort());

  const reaction = nextEvent(sa, 'wish:reaction');
  assert.equal((await ask(sb, 'wish:react', { wishId: first.wish.id, emoji: 'lotus' })).ok, true);
  assert.deepEqual((await reaction).reactions, { lotus: 1 });
  assert.ok((await ask(sb, 'wish:react', { wishId: first.wish.id, emoji: '<img>' })).error);
  assert.ok((await ask(sb, 'wish:react', { wishId: secret.wish.id, emoji: 'lotus' })).error, 'private wishes cannot be reacted to');

  assert.equal((await s.http('POST', `/api/wishes/${first.wish.id}/report`, { reason: 'test' }, a.token)).status, 400);
  const hidden = nextEvent(sa, 'wish:hidden');
  for (const reporter of [b, c, d]) await s.http('POST', `/api/wishes/${first.wish.id}/report`, { reason: 'spam' }, reporter.token);
  assert.equal((await hidden).id, first.wish.id);
  assert.equal((await s.http('GET', '/api/wishes?room=WISH', undefined, b.token)).data.wishes.length, 0, 'auto-hidden after three reports');

  const quests = (await s.http('GET', '/api/quests', undefined, a.token)).data.quests;
  assert.equal(quests.find(q => q.id === 'd-wish').completed, true);
  assert.equal((await s.http('POST', '/api/quests/d-bow/claim', {}, a.token)).status, 409, 'cannot claim unfinished quests');
  const claim = await s.http('POST', '/api/quests/d-wish/claim', {}, a.token);
  assert.equal(claim.data.granted, true); assert.ok(claim.data.items.includes('color:lotus'));
  assert.equal((await s.http('POST', '/api/quests/d-wish/claim', {}, a.token)).status, 409, 'rewards are claimed once');
  const dressed = await s.http('PUT', '/api/profile', { name: 'An', appearance: { outfitColor: '#c98f9a' } }, a.token);
  assert.equal(dressed.data.player.appearance.outfitColor, '#c98f9a', 'earned items can be worn');
  assert.ok((await s.http('GET', '/api/journal', undefined, a.token)).data.entries.some(e => e.text.includes('Lời lành đầu tiên')));

  assert.equal((await s.http('PUT', `/api/blocks/${b.id}`, {}, a.token)).data.blocks[0], b.id);
  assert.equal((await s.http('PUT', `/api/blocks/${a.id}`, {}, a.token)).status, 404, 'cannot block yourself');
});

test('Socket: bells validate distance and share a cooldown', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game, 'An'), b = guest(s.game, 'Bình');
  s.game.ctx.repos.players.saveLocation(a.id, 'courtyard', 1180, 620);
  s.game.ctx.repos.players.saveLocation(b.id, 'courtyard', 900, 790);
  const [sa, sb] = await Promise.all([connect(s.base, a.token), connect(s.base, b.token)]);
  t.after(() => { sa.close(); sb.close(); });
  assert.deepEqual([(await ask(sa, 'room:join', { room: 'BELL' })).self.x, (await ask(sb, 'room:join', { room: 'BELL' })).self.x], [1180, 900]);
  assert.match((await ask(sb, 'bell:ring', { objectId: 'bell' })).error, /gần chuông/);
  assert.match((await ask(sa, 'bell:ring', { objectId: 'board' })).error, /Không tìm thấy/);
  const heard = nextEvent(sb, 'bell:ring');
  assert.equal((await ask(sa, 'bell:ring', { objectId: 'bell' })).ok, true);
  assert.equal((await heard).by, a.id);
  assert.match((await ask(sa, 'bell:ring', { objectId: 'bell' })).error, /đang ngân/);
  assert.equal(s.game.ctx.repos.players.progress(a.id).bellsTotal, 1);
});

test('Socket: capacity of 20, one live session per guest and unauthorized sockets', async t => {
  const s = await startServer(); t.after(s.close);
  const sockets = [];
  t.after(() => sockets.forEach(socket => socket.close()));
  for (let i = 0; i < 21; i++) {
    const socket = await connect(s.base, guest(s.game, `P${i}`).token); sockets.push(socket);
    const result = await ask(socket, 'room:join', { room: 'FULL' });
    if (i < 20) assert.equal(result.ok, true, `player ${i}`); else assert.match(result.error, /đủ 20/);
  }
  const a = guest(s.game, 'An');
  const first = await connect(s.base, a.token); sockets.push(first);
  await ask(first, 'room:join', { room: 'SOLO' });
  const replaced = nextEvent(first, 'session:replaced');
  const second = await connect(s.base, a.token); sockets.push(second);
  await ask(second, 'room:join', { room: 'SOLO' });
  await replaced;
  assert.equal(s.game.ctx.rooms.get('SOLO').players.get(a.id).socketId, second.id);
  await assert.rejects(connect(s.base, 'not-a-token'), /unauthorized/);
});

test('Meditation is timed by the server, resumes after a quick reload and ends after the grace period', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game, 'An'), b = guest(s.game, 'Bình');
  let sa = await connect(s.base, a.token); const sb = await connect(s.base, b.token);
  t.after(() => { sa.close(); sb.close(); });
  await ask(sa, 'room:join', { room: 'ZEN' }); await ask(sb, 'room:join', { room: 'ZEN' });
  assert.ok((await ask(sa, 'meditation:start', { minutes: 4 })).error);
  const seen = nextEvent(sb, 'player:action', data => data.action === 'meditate');
  const started = await ask(sa, 'meditation:start', { minutes: 3 });
  assert.equal(started.meditation.plannedSeconds, 180);
  await seen;
  assert.ok((await ask(sa, 'meditation:start', { minutes: 3 })).error, 'one session at a time');
  sa.close(); await delay(100);
  sa = await connect(s.base, a.token);
  const resumed = await ask(sa, 'room:join', { room: 'ZEN' });
  assert.equal(resumed.meditation.id, started.meditation.id, 'a reload inside the grace period resumes the session');
  assert.equal(resumed.self.state, 'meditate');
  await delay(1100);
  const finished = await ask(sa, 'meditation:finish');
  assert.ok(finished.actualSeconds >= 1 && finished.actualSeconds < 5); assert.equal(finished.completed, false);
  assert.equal(s.game.db.prepare('SELECT actual_seconds FROM meditation_sessions WHERE id = ?').pluck().get(started.meditation.id), finished.actualSeconds);

  const again = await ask(sa, 'meditation:start', { minutes: 5 });
  sa.close(); await delay(500);
  assert.ok(s.game.db.prepare('SELECT ended_at FROM meditation_sessions WHERE id = ?').pluck().get(again.meditation.id), 'abandoned sessions end after the grace period');
});

test('Migrations are idempotent and quest periods roll over at local midnight', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanmay-')), file = path.join(dir, 'test.db');
  try {
    openDatabase(file).close();
    const db = openDatabase(file);
    assert.deepEqual(db.prepare('SELECT version FROM schema_migrations').pluck().all(), [1, 2, 3]);
    assert.equal(db.prepare('SELECT COUNT(*) FROM quests').pluck().get(), 9);
    db.close();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.deepEqual(periodKeys(Date.UTC(2026, 10, 1, 16, 59), 420), { daily: '2026-11-01', weekly: '2026-W44' });
  assert.deepEqual(periodKeys(Date.UTC(2026, 10, 1, 17, 0), 420), { daily: '2026-11-02', weekly: '2026-W45' });
  assert.deepEqual(periodKeys(Date.UTC(2027, 0, 1, 12), 0).weekly, '2026-W53');
});

test('Lanterns, sand patterns and mini-game activities are validated server-side', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game, 'An'), b = guest(s.game, 'Bình'), c = guest(s.game, 'Chi');
  const repo = s.game.ctx.repos.players;
  repo.saveLocation(a.id, 'lotusLake', 900, 975); repo.saveLocation(b.id, 'lotusLake', 900, 1120); repo.saveLocation(c.id, 'library', 650, 700);
  const [sa, sb, sc] = await Promise.all([a, b, c].map(g => connect(s.base, g.token)));
  t.after(() => [sa, sb, sc].forEach(socket => socket.close()));
  for (const socket of [sa, sb, sc]) await ask(socket, 'room:join', { room: 'LAKE' });
  assert.match((await ask(sb, 'lantern:release', { objectId: 'lanternDock', text: 'Xa quá' })).error, /gần mép nước/);
  assert.match((await ask(sa, 'lantern:release', { objectId: 'lanternDock', text: '' })).error, /điều ước/);
  assert.match((await ask(sa, 'lantern:release', { objectId: 'lanternDock', text: 'đm' })).error, /chưa phù hợp/);
  const seen = nextEvent(sb, 'lantern:new');
  const released = await ask(sa, 'lantern:release', { objectId: 'lanternDock', text: 'Bình an cho mọi người', style: 'boat', clientId: 'l1' });
  assert.equal(released.lantern.style, 'boat'); assert.equal((await seen).id, released.lantern.id);
  assert.equal((await ask(sa, 'lantern:release', { objectId: 'lanternDock', text: 'Bình an cho mọi người', clientId: 'l1' })).duplicate, true);
  assert.match((await ask(sa, 'lantern:release', { objectId: 'lanternDock', text: 'Lần nữa', clientId: 'l2' })).error, /trôi xa/);
  assert.equal(s.game.ctx.repos.players.progress(a.id).lanternsTotal, 1);
  sb.close(); await delay(80);
  const late = await connect(s.base, b.token); t.after(() => late.close());
  assert.deepEqual((await ask(late, 'room:join', { room: 'LAKE' })).scene.lanterns.map(l => l.id), [released.lantern.id], 'late joiners get recent lanterns');

  assert.match((await ask(sa, 'activity:complete', { objectId: 'lanternDock' })).error, /Không có hoạt động/);
  assert.equal((await ask(sc, 'activity:complete', { objectId: 'stories', title: 'Ý dẫn đầu <b>' })).ok, true);
  assert.equal((await ask(sc, 'activity:complete', { objectId: 'stories', title: 'Lần hai' })).repeated, true, 'activities are rate limited');
  assert.match((await ask(sc, 'activity:complete', { objectId: 'tea' })).error, /quay lại gần/, 'activities need the player next to the object');
  const journal = (await s.http('GET', '/api/journal', undefined, c.token)).data.entries.map(e => e.text);
  assert.ok(journal.some(text => text === 'Đọc “Ý dẫn đầu b” ở Thư Viện.'));

  assert.equal((await s.http('POST', '/api/sand-patterns', { strokes: [[[0, 0]]] }, c.token)).status, 400);
  assert.equal((await s.http('POST', '/api/sand-patterns', { strokes: [[[0, 0], [5000, 1]]] }, c.token)).status, 400);
  assert.equal((await s.http('POST', '/api/sand-patterns', { strokes: [[[0, 0], [1.5, 1]]] }, c.token)).status, 400);
  const saved = await s.http('POST', '/api/sand-patterns', { name: 'Sóng', strokes: [[[10, 10], [200, 40], [400, 90]]] }, c.token);
  assert.equal(saved.status, 201); assert.equal(saved.data.patterns[0].strokes[0].length, 3);
  assert.equal((await s.http('GET', '/api/sand-patterns', undefined, a.token)).data.patterns.length, 0, 'patterns are private');
  assert.equal((await s.http('DELETE', `/api/sand-patterns/${saved.data.id}`, undefined, a.token)).status, 404, 'others cannot delete');
  assert.equal((await s.http('DELETE', `/api/sand-patterns/${saved.data.id}`, undefined, c.token)).data.patterns.length, 0);
});

test('Personal gardens: owner-only edits, owned decor, plot bounds, planting and watering quests', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game, 'An'), b = guest(s.game, 'Bình');
  s.game.ctx.repos.players.saveLocation(a.id, 'zenGarden', 230, 960); s.game.ctx.repos.players.saveLocation(b.id, 'zenGarden', 1400, 600);
  const [sa, sb] = await Promise.all([a, b].map(g => connect(s.base, g.token)));
  t.after(() => [sa, sb].forEach(socket => socket.close()));
  for (const socket of [sa, sb]) await ask(socket, 'room:join', { room: 'GARDEN' });
  assert.match((await ask(sb, 'garden:enter')).error, /cổng vườn/, 'must be at the garden gate');
  const entered = await ask(sa, 'garden:enter');
  assert.match(entered.self.sceneId, /^garden:[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(entered.scene.garden.ownerId, a.id); assert.deepEqual(entered.scene.garden.objects, []);
  const code = entered.scene.garden.code;
  assert.equal((await ask(sa, 'garden:place', { type: 'bonsai', x: 600, y: 600 })).error, 'Bạn chưa có vật phẩm này.', 'locked decor cannot be placed');
  assert.match((await ask(sa, 'garden:place', { type: 'rock', x: 40, y: 40 })).error, /khu đất/);
  const events = nextEvent(sa, 'progress:events');
  assert.equal((await ask(sa, 'garden:place', { type: 'tree', x: 600, y: 700 })).ok, true);
  assert.ok((await events).achievements.some(x => x.id === 'tree-first'));
  assert.match((await ask(sa, 'garden:place', { type: 'rock', x: 610, y: 705 })).error, /chật/);
  const update = nextEvent(sa, 'garden:update');
  assert.equal((await ask(sa, 'garden:place', { type: 'rock', x: 400, y: 400 })).ok, true);
  const objects = (await update).objects, tree = objects.find(o => o.type === 'tree'), rock = objects.find(o => o.type === 'rock');
  assert.equal(objects.length, 2);
  const watered = await ask(sa, 'garden:water', { id: tree.id });
  assert.equal(watered.ok, true);
  assert.match((await ask(sa, 'garden:water', { id: tree.id })).error, /còn ẩm/, 'watering has a cooldown');
  assert.match((await ask(sa, 'garden:water', { id: rock.id })).error, /tưới được/);
  assert.equal((await s.http('GET', '/api/quests', undefined, a.token)).data.quests.find(q => q.id === 'd-tree').completed, true);
  assert.equal((await ask(sa, 'garden:move', { id: rock.id, x: 450, y: 420 })).ok, true);

  // A visitor can enter by code and see the garden, but cannot change it.
  sb.close(); await delay(80);
  s.game.ctx.repos.players.saveLocation(b.id, 'zenGarden', 230, 960);
  const visitor = await connect(s.base, b.token); t.after(() => visitor.close());
  await ask(visitor, 'room:join', { room: 'GARDEN' });
  assert.match((await ask(visitor, 'garden:enter', { code: 'NOPE2345' })).error, /Không tìm thấy/);
  const visit = await ask(visitor, 'garden:enter', { code });
  assert.equal(visit.scene.garden.objects.length, 2); assert.ok(visit.scene.players.some(p => p.id === a.id), 'owner and visitor meet in the garden');
  for (const [event, payload] of [['garden:place', { type: 'tree', x: 300, y: 300 }], ['garden:move', { id: rock.id, x: 500, y: 500 }], ['garden:remove', { id: rock.id }], ['garden:water', { id: tree.id }]]) assert.match((await ask(visitor, event, payload)).error, /chủ vườn/, event);
  assert.equal((await ask(sa, 'garden:remove', { id: rock.id })).ok, true);
  assert.equal(s.game.ctx.repos.gardens.objects(a.id).length, 1);
});

test('Blocking lists names and lantern reports hide a lantern after three reporters', async t => {
  const s = await startServer(); t.after(s.close);
  const [a, b, c, d] = ['An', 'Bình', 'Chi', 'Dũng'].map(name => guest(s.game, name));
  s.game.ctx.repos.players.saveLocation(a.id, 'lotusLake', 900, 975);
  const socket = await connect(s.base, a.token); t.after(() => socket.close());
  await ask(socket, 'room:join', { room: 'REPORT' });
  const { lantern } = await ask(socket, 'lantern:release', { objectId: 'lanternDock', text: 'Một ngọn đèn' });
  assert.equal((await s.http('POST', `/api/lanterns/${lantern.id}/report`, {}, a.token)).status, 400, 'cannot report your own lantern');
  const hidden = nextEvent(socket, 'lantern:hidden');
  for (const reporter of [b, c, d]) await s.http('POST', `/api/lanterns/${lantern.id}/report`, { reason: 'spam' }, reporter.token);
  assert.equal((await hidden).id, lantern.id);
  assert.equal(s.game.ctx.repos.content.lanterns('REPORT', 0).length, 0, 'hidden lanterns are no longer served');
  await s.http('PUT', `/api/blocks/${a.id}`, {}, b.token);
  assert.deepEqual((await s.http('GET', '/api/blocks', undefined, b.token)).data.blocked, [{ id: a.id, name: 'An' }]);
  assert.deepEqual((await s.http('DELETE', `/api/blocks/${a.id}`, undefined, b.token)).data.blocks, []);
});

test('Chat reaches only players in the same room and area, with length, moderation and pace limits', async t => {
  const s = await startServer(); t.after(s.close);
  const [a, b, c, d] = ['An', 'Bình', 'Chi', 'Dũng'].map(name => guest(s.game, name));
  const repo = s.game.ctx.repos.players;
  repo.saveLocation(a.id, 'courtyard', 900, 790); repo.saveLocation(b.id, 'courtyard', 950, 790); repo.saveLocation(c.id, 'mainHall', 700, 820); repo.saveLocation(d.id, 'courtyard', 900, 790);
  const sockets = await Promise.all([a, b, c, d].map(g => connect(s.base, g.token)));
  t.after(() => sockets.forEach(socket => socket.close()));
  const [sa, sb, sc, sd] = sockets;
  for (const socket of [sa, sb, sc]) await ask(socket, 'room:join', { room: 'CHAT' });
  await ask(sd, 'room:join', { room: 'OTHER' });
  const leaks = []; sc.on('chat:message', m => leaks.push(m)); sd.on('chat:message', m => leaks.push(m));
  const heardByB = nextEvent(sb, 'chat:message'), heardByA = nextEvent(sa, 'chat:message');
  const sent = await ask(sa, 'chat:send', { text: `  Chào <b>mọi người</b> ${'x'.repeat(200)}` });
  assert.equal(sent.ok, true);
  const message = await heardByB;
  assert.equal(message.id, a.id); assert.equal(message.name, 'An');
  assert.ok(message.text.startsWith('Chào b mọi người'), 'markup characters are stripped'); assert.equal(message.text.length, 100, 'trimmed to 100 characters');
  assert.equal((await heardByA).id, a.id, 'the sender sees their own bubble');
  assert.match((await ask(sa, 'chat:send', { text: 'nhanh quá' })).error, /Chậm lại/);
  assert.match((await ask(sb, 'chat:send', { text: 'vcl' })).error, /chưa phù hợp/);
  assert.match((await ask(sb, 'chat:send', { text: '   ' })).error, /trống/);
  await delay(150);
  assert.deepEqual(leaks, [], 'other areas and other rooms hear nothing');
});

test('Main hall: fortune drawing is journaled only at the tube, and the abbot tells varied sourced stories', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game, 'An');
  s.game.ctx.repos.players.saveLocation(a.id, 'mainHall', 460, 850);
  const socket = await connect(s.base, a.token); t.after(() => socket.close());
  await ask(socket, 'room:join', { room: 'HALL' });
  assert.match((await ask(socket, 'activity:complete', { objectId: 'chant' })).error, /quay lại gần/);
  assert.equal((await ask(socket, 'activity:complete', { objectId: 'fortune', title: 'Quẻ số 6 · Ấm trà chờ sôi' })).ok, true);
  const entries = (await s.http('GET', '/api/journal', undefined, a.token)).data.entries.map(e => e.text);
  assert.ok(entries.includes('Xin một quẻ ở Chánh Điện: Quẻ số 6 · Ấm trà chờ sôi.'));

  const { JsonDialogueProvider } = await import('../public/js/ui/DialoguePanel.js');
  const fs = await import('node:fs');
  const read = name => JSON.parse(fs.readFileSync(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8'));
  const provider = new JsonDialogueProvider(read('dialogues'), read('stories').items), seen = new Set();
  let previous = null;
  for (let i = 0; i < 40; i++) {
    const entry = await provider.get('abbot'), story = entry.pages[1];
    assert.notEqual(story, previous, 'never the same story twice in a row'); previous = story;
    assert.match(entry.pages[2], /Nguồn: /); seen.add(story);
  }
  assert.ok(seen.size >= 5, 'the abbot varies his stories');
  const fortunes = read('fortunes').items;
  assert.equal(fortunes.length, 12); assert.ok(fortunes.every(f => f.verse.split('\n').length === 4 && f.meaning));
});

test('Incense is lit at the censer, shared with the hall, rate limited; the monk chants on a shared 3-minute clock', async t => {
  const s = await startServer(); t.after(s.close);
  const [a, b, c] = ['An', 'Bình', 'Chi'].map(name => guest(s.game, name));
  const repo = s.game.ctx.repos.players;
  repo.saveLocation(a.id, 'mainHall', 700, 560); repo.saveLocation(b.id, 'mainHall', 700, 850); repo.saveLocation(c.id, 'mainHall', 900, 850);
  const [sa, sb] = await Promise.all([a, b].map(g => connect(s.base, g.token)));
  t.after(() => [sa, sb].forEach(socket => socket.close()));
  for (const socket of [sa, sb]) await ask(socket, 'room:join', { room: 'INCENSE' });
  assert.match((await ask(sb, 'incense:light', { objectId: 'censer' })).error, /gần lư hương/);
  assert.match((await ask(sa, 'incense:light', { objectId: 'fortune' })).error, /Không tìm thấy/);
  const seen = nextEvent(sb, 'incense:new');
  const lit = await ask(sa, 'incense:light', { objectId: 'censer' });
  assert.equal(lit.ok, true); assert.equal((await seen).playerId, a.id);
  assert.match((await ask(sa, 'incense:light', { objectId: 'censer' })).error, /vẫn đang cháy/);
  const sc = await connect(s.base, c.token); t.after(() => sc.close());
  assert.deepEqual((await ask(sc, 'room:join', { room: 'INCENSE' })).scene.incense.map(x => x.id), [lit.stick.id], 'late joiners see burning incense');
  assert.ok((await s.http('GET', '/api/journal', undefined, a.token)).data.entries.some(e => e.text === 'Thắp một nén hương ở Chánh Điện.'));

  const { HallChant, CHANT, CHANT_LINE } = await import('../public/js/systems/HallChant.js');
  const played = [];
  const fakeAudio = { running: true, muted: false, context: { currentTime: 100 }, voice: () => played.push('voice'), woodfish: () => played.push('fish'), bowl: () => played.push('bowl'), templeBell: () => played.push('bell') };
  const chant = new HallChant(fakeAudio), cycleStart = 180 * 1000 * 9000;
  assert.ok(CHANT.length < 180, 'the chant fits inside the 3-minute cycle');
  assert.equal(chant.update(cycleStart + 1000, false), null, 'nothing outside the hall');
  assert.equal(chant.update(cycleStart + (CHANT.lines[0][0] + 1) * 1000, true), CHANT_LINE, 'the line is shown while chanting');
  assert.ok(played.includes('voice') && played.includes('fish'));
  assert.equal(chant.update(cycleStart + (CHANT.length + 5) * 1000, true), null, 'silent for the rest of the cycle');
  const count = played.length;
  chant.update(cycleStart + (CHANT.length + 6) * 1000, true);
  assert.equal(played.length, count, 'no notes after the chant ends');
});
