import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { SocketClient } from '../public/js/multiplayer/SocketClient.js';
import { Api } from '../public/js/multiplayer/Api.js';
import { Clock, sample } from '../public/js/multiplayer/Interpolation.js';
import { Player } from '../public/js/entities/Player.js';
import { delay, startServer } from './helpers.mjs';

test('interpolation blends buffered snapshots and the clock ignores single late packets', () => {
  const buffer = [{ t: 1000, x: 0, y: 0 }, { t: 1100, x: 10, y: 20 }, { t: 1200, x: 20, y: 20 }];
  assert.deepEqual(sample(buffer, 1050), { t: 1050, x: 5, y: 10 });
  assert.equal(sample(buffer, 900).x, 0, 'before the buffer: hold the oldest');
  assert.equal(sample(buffer, 5000).x, 20, 'after the buffer: hold, never extrapolate');
  const clock = new Clock(); clock.observe(5000, 1000); clock.observe(5050, 1000);
  assert.ok(Math.abs(clock.offset - 4005) < .001);
  clock.observe(90000, 1000); assert.equal(clock.offset, 89000, 'a large jump resynchronises');
});

test('real browser clients: guest API, join, see and interpolate each other, wishes, reconnect status', async t => {
  const s = await startServer(); t.after(s.close);
  const memory = () => { const data = new Map(); return { get: (k, f = '') => data.get(k) ?? f, set: (k, v) => data.set(k, v) }; };
  const realFetch = globalThis.fetch; globalThis.fetch = (url, options) => realFetch(new URL(url, s.base), options);
  t.after(() => { globalThis.fetch = realFetch; });
  const apiA = new Api(memory()), apiB = new Api(memory());
  const meA = await apiA.ensureGuest('An'), meB = await apiB.ensureGuest('Bình');
  assert.equal((await apiA.ensureGuest()).id, meA.id, 'stored token is reused');
  await assert.rejects(apiB.recover('x'.repeat(43)), /không đúng/);
  assert.equal(apiB.token.length, 43, 'failed recovery keeps the previous identity');

  const connectTo = options => io(s.base, { ...options, forceNew: true });
  const statuses = [];
  const a = new SocketClient(connectTo, { status: ok => statuses.push(ok) }), b = new SocketClient(connectTo);
  t.after(() => { a.stop(); b.stop(); });
  a.room = 'NET'; b.room = 'NET';
  const joined = new Promise(resolve => { b.handlers.joined = resolve; });
  a.start(apiA.token); await delay(200); b.start(apiB.token);
  const jb = await joined;
  await delay(150);
  assert.equal(a.remotes.has(meB.id), true); assert.equal(b.remotes.has(meA.id), true);

  const pb = new Player(); pb.place(jb.self.x, jb.self.y);
  const before = a.remotes.get(meB.id).x;
  for (let i = 0; i < 6; i++) { await delay(90); pb.x += 12; pb.state = 'walk'; pb.direction = 'right'; b.sendMove(pb, i * 100); }
  pb.state = 'idle'; await delay(90); b.sendMove(pb, 1000);
  await delay(250);
  a.update(.016);
  const remote = a.remotes.get(meB.id);
  assert.ok(remote.x > before, 'remote moved'); assert.ok(remote.x <= pb.x, 'remote is rendered slightly in the past');
  assert.equal(remote.direction, 'right');
  await delay(400); a.update(.016);
  assert.ok(Math.abs(a.remotes.get(meB.id).x - pb.x) < .5, 'remote settles exactly where the player stopped');
  assert.equal(b.sendMove(pb, 2000), false, 'nothing is sent while standing still');

  const wish = await a.request('wish:create', { text: 'Một ngày an lành', clientId: 'net-1' });
  assert.equal(wish.wish.text, 'Một ngày an lành');
  await assert.rejects(a.request('wish:create', { text: 'quá nhanh', clientId: 'net-2' }), /5 giây/);

  await s.close();
  await delay(150);
  assert.equal(statuses.at(-1), false, 'losing the server is reported');
  await assert.rejects(a.request('wish:create', { text: 'offline' }), /Chưa kết nối/);
});
