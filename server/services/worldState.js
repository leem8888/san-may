import { EventEmitter } from 'node:events';

const SCOPES = new Set(['personal', 'room', 'shared']);
const PART = /^[A-Za-z0-9:_*.-]{1,64}$/;
const MAX_VALUE_BYTES = 4096;

export class StateConflictError extends Error {
  constructor(record) { super('Trạng thái vừa được người khác thay đổi. Hãy thử lại.'); this.record = record; }
}

// Builds the identity of a piece of world state. owner: player id (personal), room code (room) or 'world' (shared).
export function stateKey(scope, owner, sceneId, objectId, type) {
  if (!SCOPES.has(scope)) throw Error(`Phạm vi trạng thái không hợp lệ: ${scope}`);
  const key = { scope, owner: scope === 'shared' ? 'world' : owner, sceneId, objectId, type };
  for (const part of [key.owner, sceneId, objectId, type]) if (typeof part !== 'string' || !PART.test(part)) throw Error('Khóa trạng thái không hợp lệ.');
  return { ...key, id: [key.scope, key.owner, sceneId, objectId, type].join('|') };
}

// The single authority for persistent and temporary world changes. Values live in SQLite (so they survive a
// restart), every write bumps a version, and subscribers ('change') turn writes into Socket.IO deltas.
export class WorldStateManager extends EventEmitter {
  constructor(repo, clock = () => Date.now()) { super(); this.repo = repo; this.clock = clock; }
  alive(record, now = this.clock()) { return record && (!record.expiresAt || record.expiresAt > now) ? record : null; }
  get(key) { return this.alive(this.repo.get(key.id)); }
  value(key, fallback = null) { return this.get(key)?.value ?? fallback; }
  // Atomic read-modify-write. `change(value, record)` returns the new value, or undefined to leave it untouched.
  // `expectVersion` rejects writes based on a stale read; `ttlMs` makes the state temporary.
  update(key, change, { ttlMs, expectVersion } = {}) {
    let result = null, changed = false;
    this.repo.transaction(() => {
      const now = this.clock(), current = this.alive(this.repo.get(key.id), now);
      if (expectVersion !== undefined && (current?.version || 0) !== expectVersion) throw new StateConflictError(current);
      const value = change(current?.value, current);
      if (value === undefined) { result = current; return; }
      if (Buffer.byteLength(JSON.stringify(value)) > MAX_VALUE_BYTES) throw Error('Trạng thái quá lớn.');
      result = { ...key, value, version: (current?.version || 0) + 1, updatedAt: now, expiresAt: ttlMs ? now + ttlMs : null };
      this.repo.save(result); changed = true;
    });
    if (changed) this.emit('change', result);
    return result;
  }
  set(key, value, options) { return this.update(key, () => value, options); }
  remove(key) {
    const current = this.repo.get(key.id);
    if (!current || !this.repo.remove(key.id)) return false;
    this.emit('change', { ...current, removed: true });
    return true;
  }
  // Rows a player can see in one scene (their own, their room's, shared), ready to send as a snapshot.
  visible(playerId, room, sceneId) { return this.repo.visible(playerId, room, sceneId, this.clock()); }
  // Temporary states that ran out are deleted and announced so clients drop them too.
  purgeExpired() {
    const now = this.clock(), gone = this.repo.expired(now);
    if (gone.length) { this.repo.purge(now); for (const record of gone) this.emit('change', { ...record, removed: true }); }
    return gone.length;
  }
}

// What clients receive: never the owner (a player id or room code). A client only ever sees its own personal
// rows and its own room's rows, so scope + scene + object + type is unique on its side.
export const publicState = record => ({ id: [record.scope, record.sceneId, record.objectId, record.type].join('|'), scope: record.scope, sceneId: record.sceneId, objectId: record.objectId, type: record.type, value: record.removed ? null : record.value, version: record.version, expiresAt: record.expiresAt ?? null, ...(record.removed ? { removed: true } : {}) });
