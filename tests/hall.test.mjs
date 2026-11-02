import test from 'node:test';
import assert from 'node:assert/strict';
import { stateKey } from '../server/services/worldState.js';
import { LIMITS } from '../server/services/coop.js';
import { DURATIONS } from '../public/js/shared/rules.js';
import { ask, connect, delay, guest, nextEvent, startServer } from './helpers.mjs';

// The advanced Main Hall (P2-8) over real sockets and REST.
async function setup(t, names = ['Mai', 'Bình'], room = 'HALL8') {
  const saved = LIMITS.inviteCooldownMs; LIMITS.inviteCooldownMs = 0; t.after(() => { LIMITS.inviteCooldownMs = saved; });
  const s = await startServer(); t.after(s.close);
  const ctx = s.game.ctx, players = [];
  for (const name of names) {
    const g = guest(s.game, name);
    ctx.repos.players.saveLocation(g.id, 'mainHall', 700, 820);
    const socket = await connect(s.base, g.token); t.after(() => socket.close());
    await ask(socket, 'room:join', { room });
    players.push({ ...g, socket });
  }
  const live = p => ctx.rooms.findPlayer(p.id);
  const at = (p, id, dx = 0, dy = 40) => { const o = ctx.world.object('mainHall', id); Object.assign(live(p), { sceneId: 'mainHall', x: o.x + dx, y: o.y + dy }); };
  // A bow the server accepts: the full animation has played while standing still.
  const bow = p => { Object.assign(live(p), { state: 'bow', actionAt: Date.now() - DURATIONS.bow * 1000, moved: false }); return ask(p.socket, 'practice:complete', { type: 'bow' }); };
  return { s, ctx, players, live, at, bow };
}

test('bowing sessions: 9/27/54/108, counted only for full bows, pause/resume, survives reload, end early', async t => {
  const { s, players: [a], live, bow } = await setup(t, ['Mai']);
  assert.match((await ask(a.socket, 'practice:session', { action: 'start', type: 'bow', target: 10 })).error, /9, 27, 54/);
  const start = await ask(a.socket, 'practice:session', { action: 'start', type: 'bow', target: 9 });
  assert.deepEqual([start.session.target, start.session.done, start.session.status], [9, 0, 'active']);
  // Spamming the event without a finished bow counts nothing.
  assert.match((await ask(a.socket, 'practice:complete', { type: 'bow' })).error, /chưa trọn/);
  Object.assign(live(a), { state: 'bow', actionAt: Date.now() - 500 });
  assert.match((await ask(a.socket, 'practice:complete', { type: 'bow' })).error, /chưa trọn/, 'half a bow is not a bow');
  for (let i = 0; i < 3; i++) assert.equal((await bow(a)).session.done, i + 1);
  await ask(a.socket, 'practice:session', { action: 'pause', type: 'bow' });
  const paused = await bow(a);
  assert.equal(paused.session.done, 3, 'paused: the bow counts for the 108 round, not the session');
  assert.equal(paused.progress.bowsRound, 4);
  // Reload: the session comes back with the join.
  a.socket.close();
  const again = await connect(s.base, a.token); t.after(() => again.close()); a.socket = again;
  const joined = await ask(again, 'room:join', { room: 'HALL8' });
  assert.deepEqual([joined.practice.done, joined.practice.status], [3, 'paused']);
  await ask(a.socket, 'practice:session', { action: 'resume', type: 'bow' });
  let last;
  for (let i = 0; i < 6; i++) last = await bow(a);
  assert.equal(last.session.status, 'completed');
  assert.equal((await bow(a)).session, null, 'a finished session stops counting');
  await ask(a.socket, 'practice:session', { action: 'start', type: 'bow', target: 27 });
  await bow(a);
  const ended = await ask(a.socket, 'practice:session', { action: 'end', type: 'bow' });
  assert.deepEqual([ended.session.status, ended.session.done], ['ended', 1], 'ending early keeps what was done');
  assert.equal((await ask(a.socket, 'room:join', { room: 'HALL8' })).practice, null);
});

test('reading positions and bookmarks are validated and kept', async t => {
  const { s, players: [a] } = await setup(t, ['Mai']);
  assert.equal((await s.http('PUT', '/api/reading/nope', { position: 0 }, a.token)).status, 404);
  assert.equal((await s.http('PUT', '/api/reading/dhp-1', { position: 99 }, a.token)).status, 400);
  const saved = await s.http('PUT', '/api/reading/dhp-1', { position: 1, bookmarks: [0, 0, 2, 50, 'x'] }, a.token);
  assert.deepEqual(saved.data.bookmarks, [0, 2], 'duplicates and out-of-range bookmarks are dropped');
  const { marks } = (await s.http('GET', '/api/reading', undefined, a.token)).data;
  assert.deepEqual(marks.map(m => [m.itemId, m.position, m.bookmarks]), [['dhp-1', 1, [0, 2]]]);
});

test('prayer book: private by default, public by choice, own delete, reports, separate from the wish board', async t => {
  const { s, players: [a, b] } = await setup(t);
  const list = (p, kind) => s.http('GET', `/api/wishes?room=HALL8&kind=${kind}`, undefined, p.token).then(r => r.data.wishes);
  const secret = await ask(a.socket, 'wish:create', { kind: 'prayer', text: 'Con nguyện mẹ mau khỏe.' });
  assert.equal(secret.wish.visibility, 'private');
  await delay(5100); // existing 5 s wish cooldown
  const publicOne = nextEvent(b.socket, 'wish:new');
  await ask(a.socket, 'wish:create', { kind: 'prayer', text: 'Nguyện mọi người bình an.', visibility: 'public' });
  assert.equal((await publicOne).kind, 'prayer');
  assert.deepEqual((await list(b, 'prayer')).map(w => w.text), ['Nguyện mọi người bình an.'], 'the private prayer never reaches anyone else');
  assert.equal((await list(a, 'prayer')).length, 2);
  assert.equal((await list(a, 'wish')).length, 0, 'prayers are not on the wish board');
  const mine = (await list(a, 'prayer')).find(w => w.visibility === 'public');
  assert.equal((await s.http('DELETE', `/api/wishes/${mine.id}`, undefined, b.token)).status, 404, 'only the author can delete');
  assert.equal((await s.http('POST', `/api/wishes/${mine.id}/report`, { reason: 'test' }, b.token)).status, 200);
  const gone = nextEvent(b.socket, 'wish:hidden');
  assert.equal((await s.http('DELETE', `/api/wishes/${mine.id}`, undefined, a.token)).status, 200);
  assert.equal((await gone).id, mine.id);
  assert.equal((await list(a, 'prayer')).length, 1);
});

test('flowers are carried to the altar and seen by the room; candles by chosen place', async t => {
  const { ctx, players: [a, b], at } = await setup(t);
  at(a, 'altarVases');
  assert.match((await ask(a.socket, 'world:interact', { objectId: 'altarVases' })).error, /lấy một nhành|lấy hoa/);
  ctx.narrative.start({ id: a.id, room: 'HALL8' }, 'light-hall'); // with a story running (picking a flower is not a story event)
  at(a, 'flowerTable');
  assert.equal((await ask(a.socket, 'world:interact', { objectId: 'flowerTable', choice: 'cuc' })).result.holding, 'cuc');
  at(a, 'altarVases');
  const seen = nextEvent(b.socket, 'world:delta', d => d.objectId === 'flowerTable');
  const offered = await ask(a.socket, 'world:interact', { objectId: 'altarVases' });
  assert.match(offered.result.message, /hoa cúc vàng/);
  assert.equal((await seen).value.flowers[0].kind, 'cuc', 'the other player sees the flower appear');
  at(a, 'candleRack'); at(b, 'candleRack', 30);
  await ask(a.socket, 'world:interact', { objectId: 'candleRack', choice: 'light:4' });
  assert.match((await ask(b.socket, 'world:interact', { objectId: 'candleRack', choice: 'light:4' })).error, /đang có nến/);
  await ask(b.socket, 'world:interact', { objectId: 'candleRack', choice: 'light:5' });
  const slots = ctx.worldState.value(stateKey('room', 'HALL8', 'mainHall', 'candleRack', 'candles')).slots;
  assert.ok(slots[4] && slots[5] && !slots[0]);
  await delay(8100);
  assert.match((await ask(b.socket, 'world:interact', { objectId: 'candleRack', choice: 'snuff' })).result.message, /dập/);
  assert.equal(ctx.worldState.value(stateKey('room', 'HALL8', 'mainHall', 'candleRack', 'candles')).slots[5], null, 'only your own candle');
});

test('shared rituals in the hall: reading together and sitting together on the hall cushions', async t => {
  const { ctx, players: [a, b], at } = await setup(t);
  const invited = nextEvent(b.socket, 'coop:invite');
  await ask(a.socket, 'coop:invite', { kind: 'read', targetId: b.id, options: { item: 'raft' } });
  assert.match((await invited).note, /Chiếc bè qua sông/);
  await ask(b.socket, 'coop:respond', { sessionId: (await invited).id, accept: true });
  at(a, 'readingDesk', -60); at(b, 'readingDesk', 60);
  await ask(a.socket, 'coop:ready'); const start = await ask(b.socket, 'coop:ready');
  assert.equal(start.session.data.index, 0); assert.ok(start.session.data.total > 2);
  const turned = nextEvent(a.socket, 'coop:state', v => v.data.index === 1);
  await ask(b.socket, 'coop:act', { action: 'next' });
  assert.ok((await turned).data.text, 'both see the same passage');
  assert.match((await ask(a.socket, 'coop:act', { action: 'finish' })).error, /Chưa tới/);
  for (let i = 1; i < start.session.data.total - 1; i++) await ask(a.socket, 'coop:act', { action: 'next' });
  const done = nextEvent(b.socket, 'coop:complete');
  await ask(a.socket, 'coop:act', { action: 'finish' });
  assert.match((await done).memory, /Chiếc bè qua sông/);
  // Sitting together in the hall.
  const inv = nextEvent(b.socket, 'coop:invite');
  await ask(a.socket, 'coop:invite', { kind: 'meditate', targetId: b.id, options: { minutes: 3 } });
  await ask(b.socket, 'coop:respond', { sessionId: (await inv).id, accept: true });
  at(a, 'hallZen1', 0, 0);
  Object.assign(ctx.rooms.findPlayer(b.id), { sceneId: 'zenGarden', ...(o => ({ x: o.x, y: o.y }))(ctx.world.object('zenGarden', 'zen1')) });
  await ask(a.socket, 'coop:ready', { options: { minutes: 3 } });
  const apart = await ask(b.socket, 'coop:ready', { options: { minutes: 3 } });
  assert.match(apart.session.notice, /hai khu khác nhau/);
  at(b, 'hallZen2', 0, 0);
  const begun = nextEvent(a.socket, 'meditation:begin');
  await ask(a.socket, 'coop:ready', { options: { minutes: 3 } }); await ask(b.socket, 'coop:ready', { options: { minutes: 3 } });
  assert.equal((await begun).meditation.plannedSeconds, 180);
  const s = ctx.coop.sessionOf(a.id), complete = nextEvent(b.socket, 'coop:complete');
  ctx.coop.sweep(s.data.endsAt + 1);
  assert.match((await complete).memory, /trong Chánh Điện/);
});
