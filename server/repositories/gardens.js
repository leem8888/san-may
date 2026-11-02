const toObject = row => ({ id: row.id, type: row.type, x: row.x, y: row.y, waterCount: row.water_count, lastWateredAt: row.last_watered_at, createdAt: row.created_at });

export function createGardenRepo(db) {
  const s = {
    byOwner: db.prepare('SELECT player_id AS ownerId, visit_code AS code, name FROM gardens WHERE player_id = ?'),
    byCode: db.prepare('SELECT g.player_id AS ownerId, g.visit_code AS code, g.name, p.name AS ownerName FROM gardens g JOIN player_profiles p ON p.player_id = g.player_id WHERE g.visit_code = ?'),
    insert: db.prepare('INSERT INTO gardens (player_id, visit_code, name, updated_at) VALUES (?, ?, ?, ?)'),
    touch: db.prepare('UPDATE gardens SET updated_at = ? WHERE player_id = ?'),
    objects: db.prepare('SELECT * FROM garden_objects WHERE player_id = ? ORDER BY created_at'),
    object: db.prepare('SELECT * FROM garden_objects WHERE id = ? AND player_id = ?'),
    add: db.prepare('INSERT INTO garden_objects (id, player_id, type, x, y, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
    move: db.prepare('UPDATE garden_objects SET x = ?, y = ? WHERE id = ? AND player_id = ?'),
    remove: db.prepare('DELETE FROM garden_objects WHERE id = ? AND player_id = ?'),
    water: db.prepare('UPDATE garden_objects SET water_count = water_count + 1, last_watered_at = ? WHERE id = ? AND player_id = ?'),
  };
  return {
    byOwner: id => s.byOwner.get(id),
    byCode: code => s.byCode.get(code),
    create: (ownerId, code, name, now = Date.now()) => s.insert.run(ownerId, code, name, now),
    objects: ownerId => s.objects.all(ownerId).map(toObject),
    object: (id, ownerId) => { const row = s.object.get(id, ownerId); return row && toObject(row); },
    add(id, ownerId, type, x, y, now = Date.now()) { s.add.run(id, ownerId, type, x, y, now); s.touch.run(now, ownerId); },
    move: (id, ownerId, x, y) => s.move.run(x, y, id, ownerId).changes > 0,
    remove: (id, ownerId) => s.remove.run(id, ownerId).changes > 0,
    water: (id, ownerId, now = Date.now()) => s.water.run(now, id, ownerId).changes > 0,
  };
}
