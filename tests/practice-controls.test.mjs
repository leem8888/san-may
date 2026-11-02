import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../public/js/entities/Player.js';
import { InputManager } from '../public/js/core/InputManager.js';
import { Game } from '../public/js/core/Game.js';
import { bowDirection } from '../public/js/shared/rules.js';
import { startServer, guest, connect, ask, nextEvent, delay } from './helpers.mjs';

test('meditation ignores all movement vectors and discards queued clicks, keys and joystick input', () => {
  const player = new Player(); player.setState('meditate');
  const start = [player.x, player.y, player.direction];
  for (const vector of [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 1 }]) player.update(.1, vector, { move() { assert.fail('meditation must never move'); } });
  assert.equal(player.state, 'meditate'); assert.deepEqual([player.x, player.y, player.direction], start);
  const input = Object.assign(Object.create(InputManager.prototype), { active: true, keys: new Set(['w']), target: { x: 20, y: 30 }, stick: { x: 1, y: 1 }, joystick: { firstElementChild: { style: {} } } });
  assert.deepEqual(input.vector(player), { x: 0, y: 0 });
  assert.equal(input.target, null); assert.equal(input.keys.size, 0); assert.deepEqual(input.stick, { x: 0, y: 0 });
  assert.equal(Game.prototype.tap.call({ player, pointHandler() { assert.fail('no interaction while meditating'); } }, { x: 5, y: 5 }), true);
  player.setState('idle'); player.update(.1, { x: 1, y: 0 }, { move(p, dx) { p.x += dx; } });
  assert.ok(player.x > start[0]);
});

test('all bow directions in the main hall face the Buddha while other scenes retain their direction', () => {
  for (const dir of ['up', 'down', 'left', 'right']) {
    assert.equal(bowDirection('mainHall', 'bow', dir), 'up');
    assert.equal(bowDirection('courtyard', 'bow', dir), dir);
    assert.equal(bowDirection('mainHall', 'walk', dir), dir);
  }
});

test('server shares reverent bow direction and keeps meditation until explicitly finished', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game), b = guest(s.game);
  s.game.ctx.repos.players.saveLocation(a.id, 'mainHall', 700, 650);
  s.game.ctx.repos.players.saveLocation(b.id, 'mainHall', 900, 850);
  const sa = await connect(s.base, a.token), sb = await connect(s.base, b.token);
  t.after(() => { sa.close(); sb.close(); });
  await ask(sa, 'room:join', { room: 'PRACTICE' }); await ask(sb, 'room:join', { room: 'PRACTICE' });
  const bowed = nextEvent(sb, 'player:action', p => p.id === a.id && p.action === 'bow');
  sa.emit('player:action', { action: 'bow' }); assert.equal((await bowed).direction, 'up');
  const p = s.game.ctx.rooms.findPlayer(a.id); assert.equal(p.direction, 'up');
  sa.emit('player:move', { sceneId: 'mainHall', x: p.x, y: p.y, direction: 'down', state: 'idle' });
  await delay(20); assert.equal(p.direction, 'up');
  const started = await ask(sa, 'meditation:start', { minutes: 3 }); assert.equal(started.ok, true);
  const before = { x: p.x, y: p.y, direction: p.direction };
  const corrected = nextEvent(sa, 'player:correct');
  sa.emit('player:move', { sceneId: 'mainHall', x: p.x + 10, y: p.y, direction: 'right', state: 'walk' });
  assert.equal((await corrected).x, before.x);
  sa.emit('player:action', { action: 'idle' });
  assert.match((await ask(sa, 'player:portal', { portalId: 'toCourtyard' })).error, /Kết thúc thiền/);
  assert.equal(p.state, 'meditate'); assert.equal(p.meditation.id, started.meditation.id);
  assert.deepEqual({ x: p.x, y: p.y, direction: p.direction }, before);
  assert.equal(s.game.ctx.repos.progression.activeMeditation(a.id).id, started.meditation.id);
  assert.equal((await ask(sa, 'meditation:finish')).ok, true); assert.equal(p.meditation, null);
  sa.emit('player:move', { sceneId: 'mainHall', x: p.x + 10, y: p.y, direction: 'right', state: 'walk' });
  await delay(20); assert.equal(p.x, before.x + 10); assert.equal(p.state, 'walk');
});
