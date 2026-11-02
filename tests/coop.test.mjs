import test from 'node:test';
import assert from 'node:assert/strict';
import { stateKey } from '../server/services/worldState.js';
import { BELL, SYMBOLS, makeSecret } from '../server/services/coopActivities.js';
import { GARDEN_STAGES } from '../server/services/worldActions.js';
import { LIMITS } from '../server/services/coop.js';
import { ask, connect, delay, guest, nextEvent, startServer } from './helpers.mjs';

// Cooperative sessions with two (or three) real Socket.IO clients. The invite cooldown is shortened so the tests
// can run several activities back to back.
const COOLDOWN = 150;
async function setup(t, names = ['Mai', 'Bình'], room = 'COOP') {
  const saved = LIMITS.inviteCooldownMs; LIMITS.inviteCooldownMs = COOLDOWN; t.after(() => { LIMITS.inviteCooldownMs = saved; });
  const s = await startServer(); t.after(s.close);
  const ctx = s.game.ctx, players = [];
  for (const name of names) {
    const g = guest(s.game, name), socket = await connect(s.base, g.token);
    t.after(() => socket.close());
    await ask(socket, 'room:join', { room });
    players.push({ ...g, socket });
  }
  const live = p => ctx.rooms.findPlayer(p.id);
  const at = (p, sceneId, objectId, dx = 0, dy = 50) => { const o = ctx.world.object(sceneId, objectId); Object.assign(live(p), { sceneId, x: o.x + dx, y: o.y + dy }); };
  // Each player's own copy of the session, as the client would see it.
  const states = new Map();
  for (const p of players) p.socket.on('coop:state', v => states.set(p.id, v));
  return { s, ctx, players, live, at, states };
}
const invite = (p, target, kind, options) => ask(p.socket, 'coop:invite', { targetId: target?.id ?? null, kind, options });

test('invitations: accept, decline with cooldown, spam guard, cancel, room isolation and blocks', async t => {
  const { s, ctx, players: [a, b, c] } = await setup(t, ['Mai', 'Bình', 'Châu']);
  const invited = nextEvent(b.socket, 'coop:invite');
  const res = await invite(a, b, 'tea');
  assert.ok(res.ok, res.error);
  const card = await invited;
  assert.equal(card.from.name, 'Mai'); assert.equal(card.role, 'Người bày chén');
  assert.match((await invite(a, c, 'tea')).error, /đang có một phiên/, 'one session at a time');
  assert.match((await invite(c, b, 'bell')).error, /bận/, 'busy people cannot be invited');
  assert.match((await ask(c.socket, 'coop:respond', { sessionId: card.id, accept: true })).error, /không còn hiệu lực/, 'only the invitee can answer');
  await ask(b.socket, 'coop:respond', { sessionId: card.id, accept: false });
  assert.equal(ctx.coop.sessionOf(a.id), null);
  assert.match((await invite(a, b, 'tea')).error, /Chờ một chút/, 'invite spam guard');
  await delay(COOLDOWN + 20);
  assert.match((await invite(a, b, 'tea')).error, /vừa từ chối/, 'a decline holds the same invitation back for a while');
  const row = s.game.db.prepare("SELECT status, kind FROM coop_sessions WHERE host_id = ?").get(a.id);
  assert.deepEqual({ ...row }, { status: 'declined', kind: 'tea' });
  const second = await invite(c, b, 'bell');
  assert.ok(second.ok);
  const left = nextEvent(b.socket, 'coop:state', v => v.status === 'cancelled');
  await ask(c.socket, 'coop:leave');
  assert.match((await left).reason, /Châu đã rời phiên/);
  // Another room is out of reach.
  const outsider = guest(s.game, 'Đào'), d = await connect(s.base, outsider.token); t.after(() => d.close());
  await ask(d, 'room:join', { room: 'KHAC' });
  assert.match((await ask(d, 'coop:invite', { targetId: b.id, kind: 'tea' })).error, /không còn trong phòng/);
  await s.http('PUT', `/api/blocks/${c.id}`, undefined, b.token);
  await delay(COOLDOWN + 20); // wait out Châu's invite cooldown
  assert.match((await invite(c, b, 'tea')).error, /Không thể mời/, 'blocked people cannot invite');
});

test('tea for two: roles, order, shared memory, reward once', async t => {
  const { s, ctx, players: [a, b], at, states } = await setup(t);
  const { session } = await invite(a, b, 'tea');
  await ask(b.socket, 'coop:respond', { sessionId: session.id, accept: true });
  assert.match((await ask(a.socket, 'coop:ready')).error, /bàn trà/, 'must be at the table');
  at(a, 'zenGarden', 'teaForTwo', -60); at(b, 'zenGarden', 'teaForTwo', 60);
  assert.equal((await ask(a.socket, 'coop:ready')).session.status, 'gathering', 'waiting for the partner');
  assert.equal((await ask(b.socket, 'coop:ready')).session.status, 'active');
  assert.equal(states.get(a.id).step, 'choose');
  assert.match((await ask(b.socket, 'coop:act', { action: 'choose', payload: { tea: 'sen' } })).error, /Bước này là của Mai/);
  assert.match((await ask(a.socket, 'coop:act', { action: 'pour' })).error, /Chưa tới/);
  assert.ok((await ask(a.socket, 'coop:act', { action: 'choose', payload: { tea: 'sen' } })).ok);
  assert.ok((await ask(b.socket, 'coop:act', { action: 'cups' })).ok);
  assert.ok((await ask(a.socket, 'coop:act', { action: 'pour' })).ok);
  // Others in the area see the tea being poured.
  const pub = ctx.worldState.value(stateKey('room', 'COOP', 'zenGarden', 'teaForTwo', 'coop'));
  assert.equal(pub.step, 'sip'); assert.equal(pub.tea, 'sen');
  await ask(a.socket, 'coop:act', { action: 'sip' });
  assert.match((await ask(a.socket, 'coop:act', { action: 'sip' })).error, /rồi/);
  await ask(b.socket, 'coop:act', { action: 'sip' });
  assert.equal(states.get(b.id).step, 'talk');
  await ask(b.socket, 'coop:act', { action: 'topic', payload: { index: 1 } });
  const done = [nextEvent(a.socket, 'coop:complete'), nextEvent(b.socket, 'coop:complete')];
  await ask(a.socket, 'coop:act', { action: 'finish' });
  const [ra, rb] = await Promise.all(done);
  assert.match(ra.memory, /trà sen cùng Bình/); assert.match(rb.memory, /cùng Mai/);
  assert.equal(ra.achievement.id, 'coop-tea');
  assert.equal(ctx.worldState.value(stateKey('room', 'COOP', 'zenGarden', 'teaForTwo', 'coop')), null, 'the table is free again');
  assert.equal((await ask(a.socket, 'coop:memories')).memories.length, 1);
  // A second ceremony adds a memory but never the achievement again.
  await delay(COOLDOWN + 20);
  const again = await invite(b, a, 'tea');
  await ask(a.socket, 'coop:respond', { sessionId: again.session.id, accept: true });
  await ask(a.socket, 'coop:ready'); await ask(b.socket, 'coop:ready');
  for (const [p, action, payload] of [[b, 'choose', { tea: 'nhai' }], [a, 'cups'], [b, 'pour'], [a, 'sip'], [b, 'sip']]) assert.ok((await ask(p.socket, 'coop:act', { action, payload })).ok);
  const second = nextEvent(a.socket, 'coop:complete');
  await ask(a.socket, 'coop:act', { action: 'finish' });
  assert.equal((await second).achievement, null, 'no reward twice');
  assert.equal(s.game.db.prepare("SELECT COUNT(*) FROM player_achievements WHERE player_id = ? AND achievement_id = 'coop-tea'").pluck().get(a.id), 1);
  assert.equal((await ask(a.socket, 'coop:memories')).memories.length, 2);
});

test('disconnects: a reload in time resumes the session; staying away cancels it; leaving the area ends it', async t => {
  const { s, ctx, players: [a, b], at } = await setup(t);
  const { session } = await invite(a, b, 'bell');
  await ask(b.socket, 'coop:respond', { sessionId: session.id, accept: true });
  at(a, 'bellTower', 'bigBell', -60, 60); at(b, 'bellTower', 'bigBell', 60, 60);
  await ask(a.socket, 'coop:ready'); await ask(b.socket, 'coop:ready');
  await ask(a.socket, 'coop:act', { action: 'prepare' });
  b.socket.close();
  await delay(50);
  assert.match((await ask(a.socket, 'coop:act', { action: 'strike' })).error, /kết nối lại/, 'nothing moves on while the partner is away');
  const back = await connect(s.base, b.token); t.after(() => back.close());
  const joined = await ask(back, 'room:join', { room: 'COOP' });
  assert.equal(joined.coop.step, 'confirm', 'the reconnecting player gets the session back');
  at(b, 'bellTower', 'bigBell', 60, 60);
  assert.ok((await ask(back, 'coop:act', { action: 'confirm' })).ok);
  back.close();
  await delay(400); // longer than disconnectGraceMs (300 ms in tests)
  ctx.coop.sweep();
  assert.equal(ctx.coop.sessionOf(a.id), null);
  assert.equal(s.game.db.prepare('SELECT status, result FROM coop_sessions WHERE id = ?').get(session.id).status, 'cancelled');
  // Leaving the area mid-activity ends it for both.
  const c = guest(s.game, 'Châu'), sc = await connect(s.base, c.token); t.after(() => sc.close());
  await ask(sc, 'room:join', { room: 'COOP' });
  await delay(COOLDOWN + 20);
  const g = await invite(a, c, 'garden');
  await ask(sc, 'coop:respond', { sessionId: g.session.id, accept: true });
  at(a, 'zenGarden', 'oldGarden', 0, 70); at(c, 'zenGarden', 'oldGarden', 40, 70);
  await ask(a.socket, 'coop:ready'); await ask(sc, 'coop:ready');
  const self = ctx.rooms.findPlayer(c.id), portal = ctx.world.maps.get('zenGarden').portals.find(p => p.to === 'courtyard');
  Object.assign(self, { x: portal.x + portal.w / 2, y: portal.y + portal.h / 2 });
  const ended = nextEvent(a.socket, 'coop:state', v => v.status === 'cancelled');
  await ask(sc, 'player:portal', { portalId: portal.id });
  assert.match((await ended).reason, /Châu đã rời/);
});

test('shared bell: breathe together, strike inside the same window', async t => {
  const saved = { ...BELL };
  Object.assign(BELL, { breath: 120, breaths: 3, gap: 300, window: 150, lead: 50 });
  t.after(() => Object.assign(BELL, saved));
  const { s, ctx, players: [a, b], at } = await setup(t);
  const { session } = await invite(a, b, 'bell');
  await ask(b.socket, 'coop:respond', { sessionId: session.id, accept: true });
  at(a, 'bellTower', 'bigBell', -60, 60); at(b, 'bellTower', 'bigBell', 60, 60);
  await ask(a.socket, 'coop:ready'); await ask(b.socket, 'coop:ready');
  assert.match((await ask(b.socket, 'coop:act', { action: 'prepare' })).error, /của Mai/);
  await ask(a.socket, 'coop:act', { action: 'prepare' });
  const confirm = await ask(b.socket, 'coop:act', { action: 'confirm' });
  assert.equal((await ask(a.socket, 'coop:act', { action: 'strike' })).early, true, 'too early is gently refused');
  const strikeAt = confirm.session.data.firstStart + BELL.breath * BELL.breaths;
  await delay(Math.max(0, strikeAt - Date.now()));
  const done = nextEvent(a.socket, 'coop:complete');
  await ask(a.socket, 'coop:act', { action: 'strike' });
  await ask(b.socket, 'coop:act', { action: 'strike' });
  assert.equal((await done).achievement.id, 'coop-bell');
  assert.ok(ctx.rooms.get('COOP').bells.get('bellTower|bigBell') > 0, 'the bell rang for the room (and starts its cooldown)');
  assert.equal(ctx.repos.players.progress(a.id).bellsTotal ?? s.game.db.prepare('SELECT bells_total FROM player_stats WHERE player_id = ?').pluck().get(a.id), 1);
});

test('shared meditation: same duration, server clock, early leave is not punished', async t => {
  const { ctx, players: [a, b], at, live } = await setup(t);
  const { session } = await invite(a, b, 'meditate', { minutes: 5 });
  await ask(b.socket, 'coop:respond', { sessionId: session.id, accept: true });
  at(a, 'zenGarden', 'zen1', 0, 0); at(b, 'zenGarden', 'zen2', 0, 0);
  await ask(a.socket, 'coop:ready', { options: { minutes: 5 } });
  const mismatch = await ask(b.socket, 'coop:ready', { options: { minutes: 10 } });
  assert.match(mismatch.session.guide + (mismatch.notice || ''), /cùng chọn|thời lượng/);
  assert.equal(ctx.coop.sessionOf(a.id).status, 'gathering');
  const begin = [nextEvent(a.socket, 'meditation:begin'), nextEvent(b.socket, 'meditation:begin')];
  await ask(a.socket, 'coop:ready', { options: { minutes: 3 } });
  await ask(b.socket, 'coop:ready', { options: { minutes: 3 } });
  const [ma, mb] = await Promise.all(begin);
  assert.equal(ma.meditation.plannedSeconds, 180); assert.equal(ma.meditation.startedAt, mb.meditation.startedAt, 'one shared clock');
  assert.equal(live(a).state, 'meditate');
  const s = ctx.coop.sessionOf(a.id), ended = [nextEvent(a.socket, 'meditation:ended'), nextEvent(b.socket, 'coop:complete')];
  ctx.coop.sweep(s.data.endsAt + 1);
  const [result, complete] = await Promise.all(ended);
  assert.equal(result.shared, true); assert.equal(complete.moment, 'fireflies');
  // A second sit, ended early by one person: the other keeps sitting, nobody loses anything.
  await delay(COOLDOWN + 20);
  const again = await invite(b, a, 'meditate', { minutes: 3 });
  await ask(a.socket, 'coop:respond', { sessionId: again.session.id, accept: true });
  await ask(a.socket, 'coop:ready', { options: { minutes: 3 } }); await ask(b.socket, 'coop:ready', { options: { minutes: 3 } });
  const note = nextEvent(a.socket, 'coop:state', v => v.status === 'cancelled');
  await ask(b.socket, 'meditation:finish');
  assert.match((await note).reason, /kết thúc thiền sớm/);
  assert.equal(live(a).state, 'meditate', 'the partner keeps meditating');
});

test('garden together: different tasks, doubled turns when both work, contributions remembered', async t => {
  const saved = GARDEN_STAGES.map(st => st.cooldown);
  GARDEN_STAGES.forEach(st => { st.cooldown = 0; }); t.after(() => GARDEN_STAGES.forEach((st, i) => { st.cooldown = saved[i]; }));
  const { ctx, players: [a, b], at } = await setup(t);
  const { session } = await invite(a, b, 'garden');
  await ask(b.socket, 'coop:respond', { sessionId: session.id, accept: true });
  at(a, 'zenGarden', 'oldGarden', -40, 70); at(b, 'zenGarden', 'oldGarden', 40, 70);
  await ask(a.socket, 'coop:ready'); await ask(b.socket, 'coop:ready');
  const first = (await ask(a.socket, 'world:interact', { objectId: 'oldGarden' })).result;
  assert.match(first.message, /Nhổ cỏ dại/); assert.equal(first.doubled, false, 'alone so far');
  const second = (await ask(b.socket, 'world:interact', { objectId: 'oldGarden' })).result;
  assert.match(second.message, /Gom cành khô.*gấp đôi/); assert.equal(second.work, 3);
  await ask(a.socket, 'world:interact', { objectId: 'oldGarden' });
  const fourth = (await ask(b.socket, 'world:interact', { objectId: 'oldGarden' })).result;
  assert.equal(fourth.advanced, true, '6 work from 4 turns together');
  const done = nextEvent(a.socket, 'coop:complete');
  await ask(b.socket, 'coop:act', { action: 'finish' });
  const result = await done;
  assert.match(result.memory, /bạn góp 2 lượt, vườn thành “Vườn đã dọn”/);
  assert.equal(ctx.db.prepare("SELECT COUNT(*) FROM player_achievements WHERE achievement_id = 'coop-garden'").pluck().get(), 2, 'both helpers earn it');
});

test('symbol puzzle: split clues, two dials by two people, hints, solo mode with An', async t => {
  const { ctx, players: [a, b], at } = await setup(t);
  // Every generated secret has exactly one answer once both halves are known.
  for (let i = 0; i < 200; i++) {
    const secret = makeSecret();
    const fits = secret.hints.map(h => secret.carved.filter(id => SYMBOLS[id].props.includes(h)));
    assert.ok(fits.every(f => f.length === 1), 'clue + carved symbols give one answer');
    assert.ok(secret.hints.some(h => Object.values(SYMBOLS).filter(v => v.props.includes(h)).length > 1), 'the scroll alone is ambiguous');
  }
  const { session } = await invite(a, b, 'puzzle');
  await ask(b.socket, 'coop:respond', { sessionId: session.id, accept: true });
  assert.equal(ctx.coop.sessionOf(a.id).status, 'active');
  assert.match((await ask(a.socket, 'coop:act', { action: 'read' })).error, /Thư Viện/);
  at(a, 'library', 'clueScroll');
  assert.match((await ask(a.socket, 'coop:act', { action: 'read' })).message, /thứ nhất là/);
  at(b, 'bellTower', 'symbolStone');
  assert.match((await ask(b.socket, 'coop:act', { action: 'observe' })).message, /ba ký hiệu sáng lên/);
  const order = ctx.coop.sessionOf(a.id).data.secret.order, wrong = [...order].reverse();
  at(b, 'bellTower', 'dialLeft', 0, 40);
  await ask(b.socket, 'coop:act', { action: 'set', payload: { dial: 'left', order } });
  at(b, 'bellTower', 'dialRight', 0, 40);
  assert.match((await ask(b.socket, 'coop:act', { action: 'set', payload: { dial: 'right', order } })).message, /người khác/, 'one person cannot do both dials');
  at(a, 'bellTower', 'dialLeft', 0, 40);
  assert.equal((await ask(a.socket, 'coop:act', { action: 'set', payload: { dial: 'left', order: wrong } })).wrong, true);
  await ask(a.socket, 'coop:act', { action: 'set', payload: { dial: 'left', order: wrong } });
  await ask(b.socket, 'coop:act', { action: 'set', payload: { dial: 'right', order: wrong } });
  assert.match((await ask(a.socket, 'coop:act', { action: 'hint' })).message, new RegExp(SYMBOLS[order[0]].name), 'after two misses An names the first symbol');
  await ask(a.socket, 'coop:act', { action: 'set', payload: { dial: 'left', order } });
  const done = nextEvent(b.socket, 'coop:complete');
  assert.match((await ask(b.socket, 'coop:act', { action: 'set', payload: { dial: 'right', order } })).message, /hốc nhỏ/);
  assert.equal((await done).achievement.id, 'coop-puzzle');
  assert.ok(ctx.repos.players.items(b.id).has('badge:twoKeys'));
  assert.equal(ctx.worldState.value(stateKey('room', 'COOP', 'bellTower', 'symbolStone', 'niche')).open, true);
  // Solo: one person visits both places and sets both dials.
  await delay(COOLDOWN + 20);
  const solo = await ask(a.socket, 'coop:invite', { kind: 'puzzle' });
  assert.equal(solo.session.solo, true);
  const soloOrder = ctx.coop.sessionOf(a.id).data.secret.order;
  at(a, 'bellTower', 'dialLeft', 0, 40); await ask(a.socket, 'coop:act', { action: 'set', payload: { dial: 'left', order: soloOrder } });
  at(a, 'bellTower', 'dialRight', 0, 40);
  const soloDone = nextEvent(a.socket, 'coop:complete');
  await ask(a.socket, 'coop:act', { action: 'set', payload: { dial: 'right', order: soloOrder } });
  const r = await soloDone;
  assert.equal(r.achievement, null, 'the badge is only granted once'); assert.match(r.memory, /Một mình/);
  assert.match((await ask(a.socket, 'coop:invite', { kind: 'tea' })).error, /cần hai người|Chờ/);
});

test('gestures: greet, sit together and photo need the other person nearby and their consent', async t => {
  const { ctx, players: [a, b], live } = await setup(t);
  Object.assign(live(a), { sceneId: 'zenGarden', x: 1150, y: 600 }); Object.assign(live(b), { sceneId: 'gate', x: 800, y: 900 });
  assert.match((await invite(a, b, 'greet')).error, /gần/);
  Object.assign(live(b), { sceneId: 'zenGarden', x: 1250, y: 600 });
  const { session } = await invite(a, b, 'sit');
  const sits = [nextEvent(a.socket, 'coop:sit'), nextEvent(b.socket, 'coop:sit')];
  await ask(b.socket, 'coop:respond', { sessionId: session.id, accept: true });
  const [sa, sb] = await Promise.all(sits);
  assert.equal(sa.objectId, 'zenBench'); assert.notEqual(sa.side, sb.side, 'one seat each');
  assert.equal(ctx.coop.sessionOf(a.id), null, 'gestures finish at once');
});
