import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createGameServer } from '../server/index.js';
import { stateKey } from '../server/services/worldState.js';
import { YARD, yardKey, gardenKey } from '../server/services/worldActions.js';
import { ask, connect, guest, nextEvent, startServer } from './helpers.mjs';

// Reactive, persistent world: the courtyard restored within a session, NPCs answering the world, and long-term
// state that survives a server restart.
async function inCourtyard(t, s, name, room = 'YARD') {
  const g = guest(s.game, name);
  s.game.ctx.repos.players.saveLocation(g.id, 'courtyard', 900, 760);
  const socket = await connect(s.base, g.token); t.after(() => socket.close());
  const joined = await ask(socket, 'room:join', { room });
  return { ...g, socket, joined };
}

test('courtyard: sweep, collect, wipe, decorate, light — shared by the room, private to it, rules enforced', async t => {
  const saved = YARD.cooldown; YARD.cooldown = 0; t.after(() => { YARD.cooldown = saved; });
  const s = await startServer(); t.after(s.close);
  const ctx = s.game.ctx, a = await inCourtyard(t, s, 'Mai'), b = await inCourtyard(t, s, 'Bình');
  const live = p => ctx.rooms.findPlayer(p.id), at = (p, id) => { const o = ctx.world.object('courtyard', id); Object.assign(live(p), { x: o.x, y: o.y + 30 }); };
  const work = async (p, id) => { at(p, id); const res = await ask(p.socket, 'world:interact', { objectId: id }); return res; };
  assert.match((await work(a, 'decorLeft')).error, /Sân còn lá/, 'no decorating a dirty yard');
  assert.match((await work(a, 'leafCart')).error, /quét hết/);
  assert.match((await work(a, 'lanternSwitch')).error, /trang trí/);
  const seen = nextEvent(b.socket, 'world:delta', d => d.objectId === 'yard');
  const first = await work(a, 'pile1');
  assert.equal(first.result.stage, 1); assert.match(first.result.message, /Đang quét dọn/);
  assert.deepEqual((await seen).value.swept, ['pile1'], 'the other player sees the pile disappear');
  assert.match((await work(b, 'pile1')).error, /đã sạch/, 'one pile counts once');
  for (const id of ['pile2', 'pile3']) await work(a, id);
  for (const id of ['pile4', 'pile5', 'pile6']) await work(b, id);
  await work(b, 'leafCart');
  const clean = await work(a, 'stoneBasin');
  assert.equal(clean.result.stage, 2); assert.match(clean.result.message, /Sân sạch/);
  await work(a, 'decorLeft');
  const decorated = await work(b, 'decorRight');
  assert.equal(decorated.result.stage, 3);
  const lit = await work(a, 'lanternSwitch');
  assert.match(lit.result.message, /sáng lên/);
  const yard = ctx.worldState.get(yardKey('YARD'));
  assert.equal(yard.value.lit, true); assert.deepEqual(new Set(yard.value.helpers), new Set(['Mai', 'Bình']));
  assert.ok(yard.expiresAt > Date.now() + YARD.ttlMs - 60_000, 'in-session state: it fades after the session');
  // A latecomer gets the decorated courtyard in the snapshot; another room still has its leaves.
  const late = await inCourtyard(t, s, 'Châu');
  assert.equal(late.joined.scene.world.find(r => r.objectId === 'yard').value.stage, 3);
  const other = await inCourtyard(t, s, 'Đào', 'KHAC');
  assert.equal(other.joined.scene.world.find(r => r.objectId === 'yard'), undefined, 'room state stays in its room');
  // Expired in-session state is purged: next session the leaves are back.
  ctx.worldState.clock = () => Date.now() + YARD.ttlMs + 1000;
  assert.equal(ctx.worldState.value(yardKey('YARD')), null);
});

test('NPC dialogue follows the world: Bác Lâm per garden stage, An per courtyard stage', async t => {
  const s = await startServer(); t.after(s.close);
  const ctx = s.game.ctx, { narrative, worldState, repos } = ctx;
  const g = guest(s.game, 'Lan'), p = { id: g.id, room: 'R', name: 'Lan' };
  repos.narrative.meet(p.id, 'gardener', Date.now()); repos.narrative.meet(p.id, 'novice', Date.now());
  // Both stories already done, so the world lines are what comes up.
  repos.narrative.setFlag(p.id, 'hall.later', true, Date.now());
  for (const [id, chapter, step] of [['lam-garden', 3, 'tell'], ['an-bell', 4, 'thank']]) repos.narrative.saveProgress(p.id, id, chapter, step, 'completed');
  const first = () => narrative.begin(p, 'gardener').view.node;
  assert.notEqual(first().startsWith('garden-stage'), true);
  for (const stage of [1, 2, 3, 4]) { worldState.set(gardenKey('R'), { stage, work: 0, helpers: [] }); assert.equal(first(), `garden-stage-${stage}`); }
  worldState.set(yardKey('R'), { stage: 3, swept: [], decorated: [], helpers: [] });
  assert.equal(narrative.begin(p, 'novice').view.node, 'yard-decorated');
});

test('long-term world state survives a server restart; temporary state does not outlive its time', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanmay-world-')), dbFile = path.join(dir, 'world.db');
  let game = createGameServer({ dbFile });
  game.ctx.worldState.set(gardenKey('R'), { stage: 4, work: 0, helpers: ['Lan'] });
  game.ctx.worldState.set(stateKey('room', 'R', 'gate', 'bellHook', 'hung'), true);
  game.ctx.worldState.set(yardKey('R'), { stage: 1 }, { ttlMs: 50 });
  await game.close();
  await new Promise(r => setTimeout(r, 80));
  game = createGameServer({ dbFile }); t.after(async () => { await game.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  assert.equal(game.ctx.worldState.value(gardenKey('R')).stage, 4, 'the restored garden is still there');
  assert.equal(game.ctx.worldState.value(stateKey('room', 'R', 'gate', 'bellHook', 'hung')), true);
  assert.equal(game.ctx.worldState.value(yardKey('R')), null, 'the in-session courtyard has expired');
});
