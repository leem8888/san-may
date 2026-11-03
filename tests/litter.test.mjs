import test from 'node:test';
import assert from 'node:assert/strict';
import { guest, startServer, connect, ask, nextEvent } from './helpers.mjs';
import { InteractionSystem } from '../public/js/systems/InteractionSystem.js';
import { LITTER_BINS } from '../public/js/shared/litterBins.js';

test('tapping a visible scrap selects it above a larger nearby interaction', () => {
  const interactions = new InteractionSystem([{ id: 'table', action: 'restaurantTable', x: 800, y: 1000, hitW: 82, hitH: 70 }]);
  interactions.extra = [{ id: 'scrap', action: 'litter', x: 810, y: 1000, hitW: 20, hitH: 25 }];
  assert.equal(interactions.at(810, 1000).id, 'scrap');
});

test('ambient litter is shared and only one nearby player can pick it up', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game, 'An'), b = guest(s.game, 'Bình');
  const one = await connect(s.base, a.token), two = await connect(s.base, b.token);
  t.after(() => { one.close(); two.close(); });
  await ask(one, 'room:join', { room: 'TEMPLE' });
  await ask(two, 'room:join', { room: 'TEMPLE' });
  const p = s.game.ctx.rooms.findPlayer(a.id), q = s.game.ctx.rooms.findPlayer(b.id);
  Object.assign(p, { sceneId: 'gate', x: 800, y: 1000 });
  Object.assign(q, { sceneId: 'gate', x: 800, y: 1000 });
  const seen = nextEvent(two, 'litter:spawn');
  const dropped = await ask(one, 'litter:drop', { botId: 0, sceneId: 'gate', x: 812, y: 1000, kind: 'paper' });
  assert.ok(dropped.item?.id);
  assert.equal((await seen).id, dropped.item.id);
  assert.equal((await ask(two, 'room:join', { room: 'TEMPLE' })).scene.litter.length, 1);
  const rejoined = s.game.ctx.rooms.findPlayer(b.id);
  rejoined.x = 1000; rejoined.y = 1000;
  assert.ok((await ask(two, 'litter:pick', { id: dropped.item.id })).error);
  rejoined.x = 800; rejoined.y = 1000;
  const removed = nextEvent(one, 'litter:removed');
  const picked = await ask(two, 'litter:pick', { id: dropped.item.id });
  assert.equal(picked.carried, 'paper');
  assert.equal((await removed).id, dropped.item.id);
  assert.ok((await ask(one, 'litter:pick', { id: dropped.item.id })).error);
  assert.ok((await ask(two, 'litter:deposit')).error);
  Object.assign(rejoined, LITTER_BINS.gate);
  assert.equal((await ask(two, 'litter:deposit')).ok, true);
  assert.ok((await ask(two, 'litter:deposit')).error);
  assert.equal((await ask(one, 'room:join', { room: 'TEMPLE' })).scene.litter.length, 0);
});

test('all area bins can be reached without walking through a wall', async t => {
  const s = await startServer(); t.after(s.close);
  for (const [sceneId, bin] of Object.entries(LITTER_BINS)) assert.ok(s.game.ctx.world.walkable(sceneId, bin.x, bin.y), sceneId);
});

test('litter drop validates bot, scene, walkability and rate limit', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game), socket = await connect(s.base, a.token);
  t.after(() => socket.close());
  await ask(socket, 'room:join', { room: 'TEMPLE' });
  const good = { botId: 2, sceneId: 'gate', x: 800, y: 1000, kind: 'leaf' };
  assert.ok((await ask(socket, 'litter:drop', { ...good, botId: 16 })).error);
  assert.ok((await ask(socket, 'litter:drop', { ...good, sceneId: 'mainHall' })).error);
  assert.ok((await ask(socket, 'litter:drop', { ...good, x: -999 })).error);
  assert.equal((await ask(socket, 'litter:drop', good)).ok, true);
  assert.ok((await ask(socket, 'litter:drop', good)).error);
});
