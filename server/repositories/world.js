const toRecord = row => row && {
  id: row.id, scope: row.scope, owner: row.owner, sceneId: row.scene_id, objectId: row.object_id, type: row.state_type,
  value: JSON.parse(row.value), version: row.version, updatedAt: row.updated_at, expiresAt: row.expires_at,
};

export function createWorldRepo(db) {
  const s = {
    get: db.prepare('SELECT * FROM world_state WHERE id = ?'),
    upsert: db.prepare(`INSERT INTO world_state (id, scope, owner, scene_id, object_id, state_type, value, version, updated_at, expires_at)
      VALUES (@id, @scope, @owner, @sceneId, @objectId, @type, @value, @version, @updatedAt, @expiresAt)
      ON CONFLICT(id) DO UPDATE SET value = excluded.value, version = excluded.version, updated_at = excluded.updated_at, expires_at = excluded.expires_at`),
    remove: db.prepare('DELETE FROM world_state WHERE id = ?'),
    // Everything one player may see in one scene: their personal rows, their room's rows and shared rows.
    visible: db.prepare(`SELECT * FROM world_state
      WHERE scene_id IN (@sceneId, '*') AND (expires_at IS NULL OR expires_at > @now)
        AND ((scope = 'personal' AND owner = @playerId) OR (scope = 'room' AND owner = @room) OR scope = 'shared')`),
    expired: db.prepare('SELECT * FROM world_state WHERE expires_at IS NOT NULL AND expires_at <= ?'),
    purge: db.prepare('DELETE FROM world_state WHERE expires_at IS NOT NULL AND expires_at <= ?'),
  };
  return {
    get: id => toRecord(s.get.get(id)),
    save: record => s.upsert.run({ ...record, value: JSON.stringify(record.value), expiresAt: record.expiresAt ?? null }),
    remove: id => s.remove.run(id).changes > 0,
    visible: (playerId, room, sceneId, now = Date.now()) => s.visible.all({ playerId, room, sceneId, now }).map(toRecord),
    expired: now => s.expired.all(now).map(toRecord),
    purge: now => s.purge.run(now).changes,
    transaction: fn => db.transaction(fn)(),
  };
}
