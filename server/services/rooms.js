import { DURATIONS } from '../../public/js/shared/rules.js';

export const roomChannel = code => `r:${code}`;
export const sceneChannel = (code, sceneId) => `s:${code}:${sceneId}`;

// Finite actions fall back to idle on the server so late joiners never see a stuck animation.
export function effectiveState(p, now = Date.now()) {
  return Number.isFinite(DURATIONS[p.state]) && now - p.actionAt > DURATIONS[p.state] * 1000 ? 'idle' : p.state;
}

export function publicPlayer(p, now = Date.now()) {
  return { id: p.id, name: p.name, appearance: p.appearance, sceneId: p.sceneId, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, direction: p.direction, state: effectiveState(p, now), elapsed: Math.max(0, (now - p.actionAt) / 1000) };
}

// Live, in-memory room presence. Durable data lives in SQLite; this only tracks who is connected where.
export class RoomManager {
  constructor() { this.rooms = new Map(); }
  get(code) { return this.rooms.get(code); }
  ensure(code, isPrivate = false) {
    if (!this.rooms.has(code)) this.rooms.set(code, { code, isPrivate, players: new Map(), bells: new Map(), incense: new Map(), createdAt: Date.now() });
    return this.rooms.get(code);
  }
  findPlayer(playerId) { for (const room of this.rooms.values()) { const p = room.players.get(playerId); if (p) return p; } return null; }
  remove(p) {
    const room = this.rooms.get(p.room);
    if (!room || room.players.get(p.id) !== p) return false;
    room.players.delete(p.id);
    if (!room.players.size) this.rooms.delete(p.room);
    return true;
  }
  inScene(code, sceneId) { return [...(this.rooms.get(code)?.players.values() || [])].filter(p => p.sceneId === sceneId); }
  publicRooms() { return [...this.rooms.values()].filter(room => !room.isPrivate).map(room => ({ code: room.code, online: room.players.size })).sort((a, b) => b.online - a.online).slice(0, 30); }
}
