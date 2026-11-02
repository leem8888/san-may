export function createRoomRepo(db) {
  const s = {
    insert: db.prepare('INSERT INTO rooms (code, is_private, created_by, created_at) VALUES (?, ?, ?, ?)'),
    get: db.prepare('SELECT code, is_private AS isPrivate, created_by AS createdBy, created_at AS createdAt FROM rooms WHERE code = ?'),
    join: db.prepare('INSERT INTO room_history (room, player_id, joined_at) VALUES (?, ?, ?)'),
    leave: db.prepare('UPDATE room_history SET left_at = ? WHERE id = ? AND left_at IS NULL'),
  };
  return {
    create: (code, isPrivate, playerId, now = Date.now()) => s.insert.run(code, isPrivate ? 1 : 0, playerId, now),
    get: code => { const row = s.get.get(code); return row && { ...row, isPrivate: Boolean(row.isPrivate) }; },
    recordJoin: (code, playerId, now = Date.now()) => Number(s.join.run(code, playerId, now).lastInsertRowid),
    recordLeave: (historyId, now = Date.now()) => s.leave.run(now, historyId),
  };
}
