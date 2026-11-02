// Player-generated public content: wishes, reactions, lanterns and moderation reports.
export function createContentRepo(db) {
  const s = {
    insertWish: db.prepare('INSERT INTO wishes (id, room, player_id, name, text, visibility, created_at) VALUES (@id, @room, @playerId, @name, @text, @visibility, @createdAt)'),
    wish: db.prepare('SELECT * FROM wishes WHERE id = ?'),
    // Public wishes of the room plus the viewer's own private ones, newest first, minus blocked authors.
    wishes: db.prepare(`SELECT w.id, w.player_id AS playerId, w.name, w.text, w.visibility, w.created_at AS createdAt,
        (SELECT emoji FROM wish_reactions WHERE wish_id = w.id AND player_id = @viewer) AS mine
      FROM wishes w
      WHERE w.room = @room AND w.hidden = 0 AND w.created_at < @before
        AND (w.visibility = 'public' OR w.player_id = @viewer)
        AND w.player_id NOT IN (SELECT blocked_id FROM player_blocks WHERE player_id = @viewer)
      ORDER BY w.created_at DESC LIMIT @limit`),
    reactions: db.prepare('SELECT wish_id AS wishId, emoji, COUNT(*) AS count FROM wish_reactions WHERE wish_id IN (SELECT value FROM json_each(?)) GROUP BY wish_id, emoji'),
    react: db.prepare(`INSERT INTO wish_reactions (wish_id, player_id, emoji, created_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(wish_id, player_id) DO UPDATE SET emoji = excluded.emoji, created_at = excluded.created_at`),
    unreact: db.prepare('DELETE FROM wish_reactions WHERE wish_id = ? AND player_id = ?'),
    report: db.prepare('INSERT OR IGNORE INTO reports (reporter_id, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?)'),
    reportCount: db.prepare('SELECT COUNT(*) FROM reports WHERE target_type = ? AND target_id = ?').pluck(),
    hideWish: db.prepare('UPDATE wishes SET hidden = 1 WHERE id = ?'),
    insertLantern: db.prepare('INSERT INTO lanterns (id, room, player_id, name, text, style, created_at) VALUES (@id, @room, @playerId, @name, @text, @style, @createdAt)'),
    lantern: db.prepare('SELECT * FROM lanterns WHERE id = ?'),
    lanterns: db.prepare(`SELECT id, player_id AS playerId, name, text, style, created_at AS createdAt FROM lanterns
      WHERE room = ? AND hidden = 0 AND created_at >= ? ORDER BY created_at DESC LIMIT 40`),
    hideLantern: db.prepare('UPDATE lanterns SET hidden = 1 WHERE id = ?'),
    insertSand: db.prepare('INSERT INTO sand_patterns (id, player_id, name, strokes, created_at) VALUES (?, ?, ?, ?, ?)'),
    sand: db.prepare('SELECT id, name, strokes, created_at AS createdAt FROM sand_patterns WHERE player_id = ? ORDER BY created_at DESC'),
    sandCount: db.prepare('SELECT COUNT(*) FROM sand_patterns WHERE player_id = ?').pluck(),
    deleteSand: db.prepare('DELETE FROM sand_patterns WHERE id = ? AND player_id = ?'),
  };

  function reactionMap(ids) {
    const map = Object.fromEntries(ids.map(id => [id, {}]));
    for (const row of s.reactions.all(JSON.stringify(ids))) map[row.wishId][row.emoji] = row.count;
    return map;
  }

  return {
    insertWish: wish => s.insertWish.run(wish),
    wish: id => s.wish.get(id),
    wishes({ room, viewer, before = Number.MAX_SAFE_INTEGER, limit = 20 }) {
      const rows = s.wishes.all({ room, viewer, before, limit });
      const reactions = reactionMap(rows.map(row => row.id));
      return rows.map(row => ({ ...row, reactions: reactions[row.id] }));
    },
    reactions: id => reactionMap([id])[id],
    react: (wishId, playerId, emoji, now = Date.now()) => emoji ? s.react.run(wishId, playerId, emoji, now) : s.unreact.run(wishId, playerId),
    // Returns the number of distinct reporters after this report.
    report(reporterId, type, targetId, reason, now = Date.now()) {
      s.report.run(reporterId, type, targetId, reason, now);
      return s.reportCount.get(type, targetId);
    },
    hideWish: id => s.hideWish.run(id),
    insertLantern: lantern => s.insertLantern.run(lantern),
    lantern: id => s.lantern.get(id),
    lanterns: (room, since) => s.lanterns.all(room, since),
    hideLantern: id => s.hideLantern.run(id),
    insertSand: (id, playerId, name, strokes, now = Date.now()) => s.insertSand.run(id, playerId, name, JSON.stringify(strokes), now),
    sandPatterns: playerId => s.sand.all(playerId).map(row => ({ ...row, strokes: JSON.parse(row.strokes) })),
    sandCount: playerId => s.sandCount.get(playerId),
    deleteSand: (id, playerId) => s.deleteSand.run(id, playerId).changes > 0,
  };
}
