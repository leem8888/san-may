// Bowing sessions and reading positions (Main Hall, P2-8).
const toSession = row => row ? { id: row.id, type: row.type, target: row.target, done: row.done, status: row.status, startedAt: row.started_at, updatedAt: row.updated_at } : null;

export function createPracticeRepo(db) {
  const s = {
    current: db.prepare("SELECT * FROM practice_sessions WHERE player_id = ? AND type = ? AND status IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1"),
    start: db.prepare("INSERT INTO practice_sessions (id, player_id, type, target, done, status, started_at, updated_at) VALUES (?, ?, ?, ?, 0, 'active', ?, ?)"),
    status: db.prepare('UPDATE practice_sessions SET status = ?, updated_at = ? WHERE id = ?'),
    count: db.prepare("UPDATE practice_sessions SET done = done + 1, status = CASE WHEN done + 1 >= target THEN 'completed' ELSE status END, updated_at = ? WHERE id = ? AND status = 'active'"),
    get: db.prepare('SELECT * FROM practice_sessions WHERE id = ?'),
    marks: db.prepare('SELECT item_id AS itemId, position, bookmarks, updated_at AS updatedAt FROM reading_marks WHERE player_id = ?'),
    saveMark: db.prepare(`INSERT INTO reading_marks (player_id, item_id, position, bookmarks, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, item_id) DO UPDATE SET position = excluded.position, bookmarks = excluded.bookmarks, updated_at = excluded.updated_at`),
  };
  return {
    current: (playerId, type) => toSession(s.current.get(playerId, type)),
    start: (id, playerId, type, target, now) => { s.start.run(id, playerId, type, target, now, now); return toSession(s.get.get(id)); },
    setStatus: (id, status, now) => { s.status.run(status, now, id); return toSession(s.get.get(id)); },
    count: (id, now) => s.count.run(now, id).changes > 0 ? toSession(s.get.get(id)) : null,
    marks: playerId => s.marks.all(playerId).map(m => ({ ...m, bookmarks: JSON.parse(m.bookmarks) })),
    saveMark: (playerId, itemId, position, bookmarks, now) => s.saveMark.run(playerId, itemId, position, JSON.stringify(bookmarks), now),
  };
}
