// Outcomes of two-person activities and the memories each participant keeps of them.
export function createCoopRepo(db) {
  const s = {
    save: db.prepare(`INSERT INTO coop_sessions (id, room_code, kind, host_id, guest_id, status, result, created_at, started_at, ended_at)
      VALUES (@id, @room, @kind, @hostId, @guestId, @status, @result, @createdAt, @startedAt, @endedAt)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, result = excluded.result, started_at = excluded.started_at, ended_at = excluded.ended_at`),
    memory: db.prepare('INSERT INTO shared_memories (id, session_id, player_id, partner_name, kind, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    memories: db.prepare('SELECT id, kind, partner_name AS partnerName, text, created_at AS createdAt FROM shared_memories WHERE player_id = ? ORDER BY created_at DESC LIMIT ?'),
    completed: db.prepare("SELECT COUNT(*) FROM coop_sessions WHERE status = 'completed' AND kind = ? AND (host_id = ? OR guest_id = ?)").pluck(),
  };
  return {
    save: session => s.save.run({ ...session, guestId: session.guestId || null, startedAt: session.startedAt || null, result: JSON.stringify(session.result || {}) }),
    remember: (id, sessionId, playerId, partnerName, kind, text, now) => s.memory.run(id, sessionId, playerId, partnerName, kind, text, now),
    memories: (playerId, limit = 40) => s.memories.all(playerId, limit),
    completed: (playerId, kind) => s.completed.get(kind, playerId, playerId),
  };
}
