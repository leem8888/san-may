// Client mirror of the server's WorldStateManager. Snapshots replace a scene's rows; deltas only apply when
// their version is newer, so a late or duplicated packet can never roll the world back.
export class WorldStateStore {
  constructor() { this.records = new Map(); this.listeners = new Set(); }
  load(list, sceneId) {
    for (const [id, record] of this.records) if (record.sceneId === sceneId || record.sceneId === '*') this.records.delete(id);
    for (const record of list || []) this.records.set(record.id, record);
    for (const record of list || []) this.emit(record);
  }
  apply(delta) {
    const current = this.records.get(delta.id);
    if (current && delta.version < current.version) return false;
    if (current && delta.version === current.version && !delta.removed) return false;
    if (delta.removed) this.records.delete(delta.id); else this.records.set(delta.id, delta);
    this.emit(delta);
    return true;
  }
  // Personal state wins over room state, which wins over shared state, for the same object and type.
  get(sceneId, objectId, type) {
    for (const scope of ['personal', 'room', 'shared']) {
      const record = this.records.get([scope, sceneId, objectId, type].join('|')) || this.records.get([scope, '*', objectId, type].join('|'));
      if (record && (!record.expiresAt || record.expiresAt > Date.now())) return record.value;
    }
    return null;
  }
  on(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(record) { for (const listener of this.listeners) listener(record); }
}
