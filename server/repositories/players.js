const COUNTERS = ['bows_total', 'beads_total', 'bow_rounds', 'bead_rounds', 'bells_total', 'wishes_total', 'lanterns_total', 'meditation_seconds', 'trees_planted', 'trees_watered'];

const toProgress = row => row && {
  bowsRound: row.bows_round, beadsRound: row.beads_round, bowsTotal: row.bows_total, beadsTotal: row.beads_total,
  bowRounds: row.bow_rounds, beadRounds: row.bead_rounds, bellsTotal: row.bells_total, wishesTotal: row.wishes_total,
  lanternsTotal: row.lanterns_total, meditationSeconds: row.meditation_seconds, treesPlanted: row.trees_planted,
  treesWatered: row.trees_watered, scenesVisited: JSON.parse(row.scenes_visited), lastScene: row.last_scene, lastX: row.last_x, lastY: row.last_y,
};
const toProfile = row => row && {
  name: row.name,
  appearance: { hairStyle: row.hair_style, hairColor: row.hair_color, outfitStyle: row.outfit_style, outfitColor: row.outfit_color, accessory: row.accessory },
};

export function createPlayerRepo(db) {
  const s = {
    insert: db.prepare('INSERT INTO players (id, token_hash, created_at, last_seen) VALUES (?, ?, ?, ?)'),
    byHash: db.prepare('SELECT id, created_at, last_seen FROM players WHERE token_hash = ?'),
    byId: db.prepare('SELECT id, created_at, last_seen FROM players WHERE id = ?'),
    touch: db.prepare('UPDATE players SET last_seen = ? WHERE id = ?'),
    profile: db.prepare('SELECT * FROM player_profiles WHERE player_id = ?'),
    saveProfile: db.prepare(`INSERT INTO player_profiles (player_id, name, hair_style, hair_color, outfit_style, outfit_color, accessory, updated_at)
      VALUES (@id, @name, @hairStyle, @hairColor, @outfitStyle, @outfitColor, @accessory, @now)
      ON CONFLICT(player_id) DO UPDATE SET name = excluded.name, hair_style = excluded.hair_style, hair_color = excluded.hair_color,
        outfit_style = excluded.outfit_style, outfit_color = excluded.outfit_color, accessory = excluded.accessory, updated_at = excluded.updated_at`),
    insertProgress: db.prepare('INSERT INTO player_progress (player_id, updated_at) VALUES (?, ?)'),
    progress: db.prepare('SELECT * FROM player_progress WHERE player_id = ?'),
    setRounds: db.prepare('UPDATE player_progress SET bows_round = ?, beads_round = ?, updated_at = ? WHERE player_id = ?'),
    location: db.prepare('UPDATE player_progress SET last_scene = ?, last_x = ?, last_y = ?, updated_at = ? WHERE player_id = ?'),
    visited: db.prepare('UPDATE player_progress SET scenes_visited = ?, updated_at = ? WHERE player_id = ?'),
    items: db.prepare('SELECT item_id FROM player_items WHERE player_id = ?').pluck(),
    grant: db.prepare('INSERT OR IGNORE INTO player_items (player_id, item_id, source, unlocked_at) VALUES (?, ?, ?, ?)'),
    blocks: db.prepare('SELECT blocked_id FROM player_blocks WHERE player_id = ?').pluck(),
    blockedProfiles: db.prepare('SELECT b.blocked_id AS id, p.name FROM player_blocks b JOIN player_profiles p ON p.player_id = b.blocked_id WHERE b.player_id = ? ORDER BY b.created_at DESC'),
    block: db.prepare('INSERT OR IGNORE INTO player_blocks (player_id, blocked_id, created_at) VALUES (?, ?, ?)'),
    unblock: db.prepare('DELETE FROM player_blocks WHERE player_id = ? AND blocked_id = ?'),
  };
  const increments = Object.fromEntries(COUNTERS.map(column => [column, db.prepare(`UPDATE player_progress SET ${column} = ${column} + ?, updated_at = ? WHERE player_id = ?`)]));

  return {
    create({ id, tokenHash, name, appearance, now = Date.now() }) {
      db.transaction(() => {
        s.insert.run(id, tokenHash, now, now);
        s.saveProfile.run({ id, name, ...appearance, now });
        s.insertProgress.run(id, now);
      })();
    },
    byTokenHash: hash => s.byHash.get(hash),
    exists: id => Boolean(s.byId.get(id)),
    touch: (id, now = Date.now()) => s.touch.run(now, id),
    profile: id => toProfile(s.profile.get(id)),
    saveProfile: (id, name, appearance, now = Date.now()) => s.saveProfile.run({ id, name, ...appearance, now }),
    progress: id => toProgress(s.progress.get(id)),
    setRounds: (id, bows, beads, now = Date.now()) => s.setRounds.run(bows, beads, now, id),
    increment(id, column, amount = 1, now = Date.now()) {
      if (!increments[column]) throw Error(`Unknown counter ${column}`);
      increments[column].run(amount, now, id);
    },
    saveLocation: (id, scene, x, y, now = Date.now()) => s.location.run(scene, x, y, now, id),
    saveVisited: (id, scenes, now = Date.now()) => s.visited.run(JSON.stringify(scenes), now, id),
    items: id => new Set(s.items.all(id)),
    grant: (id, itemId, source, now = Date.now()) => s.grant.run(id, itemId, source, now).changes > 0,
    blocks: id => s.blocks.all(id),
    blockedProfiles: id => s.blockedProfiles.all(id),
    block: (id, blockedId, now = Date.now()) => s.block.run(id, blockedId, now),
    unblock: (id, blockedId) => s.unblock.run(id, blockedId),
  };
}
