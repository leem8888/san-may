import test from 'node:test';
import assert from 'node:assert/strict';
import { ask, connect, guest, nextEvent, startServer } from './helpers.mjs';
import { validSandStrokes } from '../public/js/shared/sand.js';
import { SandGame } from '../public/js/ui/minigames/SandGame.js';
import { el } from '../public/js/ui/dom.js';

test('UI helper puts button labels in visible text content', () => {
  const original = globalThis.document;
  globalThis.document = { createElement: () => ({ setAttribute() {}, addEventListener() {}, append() {} }) };
  try { assert.equal(el('button', { text: 'Xong' }).textContent, 'Xong'); }
  finally { if (original === undefined) delete globalThis.document; else globalThis.document = original; }
});

test('sand finish visibly waits for acknowledgement, keeps failed drawings and allows retry', async () => {
  const statuses = [], strokes = [[[0, 0], [500, 300]]];
  let reject, calls = 0, completed = 0;
  const drawing = Object.assign(Object.create(SandGame.prototype), {
    strokes, finishButton: {}, status: text => statuses.push(text),
    applySand: () => { calls++; return new Promise((resolve, fail) => { reject = fail; }); },
    done: async () => { completed++; },
  });
  const pending = drawing.finish();
  assert.equal(drawing.finishButton.disabled, true);
  assert.match(drawing.finishButton.textContent, /Đang/);
  await drawing.finish(); assert.equal(calls, 1, 'double tap submits only once');
  reject(Object.assign(Error('timeout'), { code: 'SOCKET_TIMEOUT' })); await pending;
  assert.match(statuses.at(-1), /npm start/);
  assert.deepEqual(drawing.strokes, strokes);
  assert.equal(drawing.finishButton.disabled, false); assert.equal(completed, 0);
  drawing.applySand = async received => { assert.deepEqual(received, strokes); assert.notEqual(received, strokes); };
  await drawing.finish(); assert.equal(completed, 1);
});

test('sand strokes enforce canvas bounds, stroke sizes and total point budget', () => {
  assert.equal(validSandStrokes([]), true);
  assert.equal(validSandStrokes([[[0, 0], [1000, 600]]]), true);
  for (const strokes of [null, [[[0, 0]]], [[[0, 0], [1, 601]]], [[[0, 0], [-1, 2]]], [[[0, 0], [1.5, 2]]], [Array.from({ length: 1601 }, () => [1, 2])]]) assert.equal(validSandStrokes(strokes), false);
});

test('finished sand drawing is shared, persisted, restored and isolated by room', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game), b = guest(s.game), c = guest(s.game);
  for (const p of [a, b, c]) s.game.ctx.repos.players.saveLocation(p.id, 'zenGarden', 510, 700);
  const sa = await connect(s.base, a.token), sb = await connect(s.base, b.token), sc = await connect(s.base, c.token);
  t.after(() => { sa.close(); sb.close(); sc.close(); });
  await ask(sa, 'room:join', { room: 'SAND-1' }); await ask(sb, 'room:join', { room: 'SAND-1' }); await ask(sc, 'room:join', { room: 'SAND-2' });
  const strokes = [[[0, 0], [500, 300], [1000, 600]], [[200, 300], [400, 500]]];
  assert.ok((await ask(sa, 'sand:apply', { objectId: 'sand', strokes: [[[0, 0], [1, 601]]] })).error);
  const received = nextEvent(sb, 'sand:update');
  assert.equal((await ask(sa, 'sand:apply', { objectId: 'sand', strokes })).ok, true);
  assert.deepEqual((await received).strokes, strokes);
  assert.deepEqual(s.game.ctx.repos.content.roomSand('SAND-1'), strokes);
  assert.equal(s.game.ctx.repos.content.roomSand('SAND-2'), null);
  const restored = await ask(sb, 'room:join', { room: 'SAND-1' });
  assert.deepEqual(restored.scene.sand, strokes);
  assert.equal((await ask(sc, 'room:join', { room: 'SAND-2' })).scene.sand, null);
  assert.ok((await ask(sa, 'sand:apply', { objectId: 'sand', strokes })).error, 'updates are rate limited');
  // The player can submit only at the rake, never from another scene.
  s.game.ctx.rooms.findPlayer(c.id).sceneId = 'mainHall';
  assert.ok((await ask(sc, 'sand:apply', { objectId: 'sand', strokes })).error);
});
