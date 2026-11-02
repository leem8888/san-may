import { io as connectClient } from 'socket.io-client';
import { setTimeout as delay } from 'node:timers/promises';
import { createGameServer } from '../server/index.js';

export { delay };

export async function startServer(overrides = {}) {
  const game = createGameServer({ dbFile: ':memory:', disconnectGraceMs: 300, ...overrides });
  await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${game.server.address().port}`;
  const http = async (method, path, body, token) => {
    const response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    let data = null; try { data = await response.json(); } catch { /* static file */ }
    return { status: response.status, data, headers: response.headers };
  };
  return { game, base, http, close: () => game.close() };
}

// Bulk guests are issued directly so tests are not throttled by the per-IP /api/guest limiter.
export const guest = (game, name = 'Khách') => game.ctx.identity.issue(name);

export function connect(base, token) {
  const socket = connectClient(base, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', error => { socket.close(); reject(error); });
  });
}

export const ask = (socket, event, data = {}) => socket.timeout(3000).emitWithAck(event, data);

export function nextEvent(socket, event, filter = () => true, ms = 2500) {
  return new Promise((resolve, reject) => {
    const handler = data => { if (!filter(data)) return; clearTimeout(timer); socket.off(event, handler); resolve(data); };
    const timer = setTimeout(() => { socket.off(event, handler); reject(Error(`Timed out waiting for ${event}`)); }, ms);
    socket.on(event, handler);
  });
}

// Walks in legal steps (well under the server speed limit) so movement validation accepts every packet.
export async function walk(socket, sceneId, from, to, step = 36, ms = 110) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y), count = Math.max(1, Math.ceil(distance / step));
  for (let i = 1; i <= count; i++) {
    await delay(ms);
    socket.emit('player:move', { sceneId, x: from.x + (to.x - from.x) * i / count, y: from.y + (to.y - from.y) * i / count, direction: 'up', state: i === count ? 'idle' : 'walk' });
  }
  await delay(60);
}
