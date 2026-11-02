import { RemotePlayer } from './RemotePlayer.js';
import { Clock, RENDER_DELAY } from './Interpolation.js';

const FORWARDED = ['bell:ring', 'wish:new', 'wish:reaction', 'wish:hidden', 'lantern:new', 'lantern:hidden', 'progress:events', 'meditation:ended', 'player:correct', 'player:emote', 'session:replaced', 'garden:update', 'chat:message'];
const SEND_INTERVAL = 80; // ~12 position updates per second while moving, nothing while still

// `connect` is the socket.io `io` factory (injected so Node tests can pass socket.io-client).
export class SocketClient {
  constructor(connect, handlers = {}) {
    this.connect = connect; this.handlers = handlers; this.socket = null; this.room = null; this.sceneId = null; this.selfId = null;
    this.remotes = new Map(); this.clock = new Clock(); this.last = { at: -Infinity, x: NaN, y: NaN, direction: '', state: '' };
  }
  get connected() { return Boolean(this.socket?.connected); }
  start(token) {
    this.stop();
    const socket = this.socket = this.connect({ auth: { token }, reconnectionDelayMax: 5000, transports: ['websocket', 'polling'] });
    const handle = (name, ...args) => this.handlers[name]?.(...args);
    socket.on('connect', () => {
      handle('status', true);
      // Automatic reconnect: rejoin the same room; the server restores the last accepted position.
      if (this.room) this.join(this.room).catch(error => handle('error', error));
    });
    socket.on('disconnect', reason => handle('status', false, reason === 'io server disconnect' ? 'Máy chủ đã ngắt phiên' : 'Mất kết nối · đang thử lại'));
    socket.on('connect_error', error => { handle('status', false, error.message === 'unauthorized' ? 'Phiên khách không hợp lệ' : 'Không liên lạc được máy chủ · đang thử lại'); if (error.message === 'unauthorized') handle('unauthorized'); });
    socket.on('room:state', data => this.applyState(data));
    socket.on('room:online', data => handle('online', data.online));
    socket.on('player:join', data => { if (data.sceneId === this.sceneId && data.id !== this.selfId) this.remotes.set(data.id, new RemotePlayer(data, this.clock.now())); });
    socket.on('player:leave', data => this.remotes.delete(data.id));
    socket.on('player:action', data => this.remotes.get(data.id)?.action(data.action));
    socket.on('player:update', data => { const remote = this.remotes.get(data.id); if (remote) Object.assign(remote, { name: data.name, appearance: data.appearance }); handle('playerUpdate', data); });
    for (const event of FORWARDED) socket.on(event, data => handle(event, data));
  }
  stop() { this.socket?.removeAllListeners(); this.socket?.disconnect(); this.socket = null; this.remotes.clear(); }
  request(event, data = {}, timeout = 7000) {
    return new Promise((resolve, reject) => {
      if (!this.connected) return reject(Error('Chưa kết nối máy chủ. Hãy đợi kết nối lại.'));
      this.socket.timeout(timeout).emit(event, data, (error, response) => {
        if (error) return reject(Error('Máy chủ không phản hồi kịp. Hãy thử lại.'));
        if (response?.error) return reject(Object.assign(Error(response.error), { data: response }));
        resolve(response);
      });
    });
  }
  async join(room) {
    this.room = room;
    const response = await this.request('room:join', { room });
    this.selfId = response.self.id;
    this.clock.observe(response.serverNow);
    this.loadScene(response.scene);
    this.last = { at: -Infinity, x: response.self.x, y: response.self.y, direction: '', state: '' };
    this.handlers.joined?.(response);
    return response;
  }
  leave() { this.room = null; this.sceneId = null; this.remotes.clear(); if (this.connected) this.socket.emit('room:leave'); }
  loadScene(scene) {
    this.sceneId = scene.sceneId; this.remotes.clear();
    const now = this.clock.now();
    for (const p of scene.players) this.remotes.set(p.id, new RemotePlayer(p, now));
  }
  applyState(data) {
    if (data.sceneId !== this.sceneId) return;
    this.clock.observe(data.t);
    for (const p of data.players) {
      if (p.id === this.selfId) continue;
      const remote = this.remotes.get(p.id);
      if (remote) remote.push(p, data.t); else this.remotes.set(p.id, new RemotePlayer(p, data.t));
    }
    if (data.full) { const present = new Set(data.players.map(p => p.id)); for (const id of this.remotes.keys()) if (!present.has(id)) this.remotes.delete(id); }
  }
  sendMove(player, now = performance.now(), force = false) {
    if (!this.connected || !this.sceneId) return false;
    const state = player.state === 'walk' ? 'walk' : 'idle', last = this.last;
    const changed = Math.hypot(player.x - last.x, player.y - last.y) > .5 || player.direction !== last.direction || state !== last.state;
    if (!changed || (!force && now - last.at < SEND_INTERVAL)) return false;
    this.last = { at: now, x: player.x, y: player.y, direction: player.direction, state };
    this.socket.emit('player:move', { sceneId: this.sceneId, x: Math.round(player.x * 10) / 10, y: Math.round(player.y * 10) / 10, direction: player.direction, state });
    return true;
  }
  action(action) { if (this.connected && this.sceneId) this.socket.emit('player:action', { action }); }
  emote(emote) { if (this.connected && this.sceneId) this.socket.emit('player:emote', { emote }); }
  update(dt) { const renderTime = this.clock.now() - RENDER_DELAY; for (const remote of this.remotes.values()) remote.update(dt, renderTime); }
}
