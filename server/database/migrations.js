// Append-only: never edit a migration that may already have run; add a new version instead.
export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial schema',
    up: `
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      );
      CREATE TABLE player_profiles (
        player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        hair_style TEXT NOT NULL,
        hair_color TEXT NOT NULL,
        outfit_style TEXT NOT NULL,
        outfit_color TEXT NOT NULL,
        accessory TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE player_progress (
        player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        bows_round INTEGER NOT NULL DEFAULT 0,
        beads_round INTEGER NOT NULL DEFAULT 0,
        bows_total INTEGER NOT NULL DEFAULT 0,
        beads_total INTEGER NOT NULL DEFAULT 0,
        bow_rounds INTEGER NOT NULL DEFAULT 0,
        bead_rounds INTEGER NOT NULL DEFAULT 0,
        bells_total INTEGER NOT NULL DEFAULT 0,
        wishes_total INTEGER NOT NULL DEFAULT 0,
        lanterns_total INTEGER NOT NULL DEFAULT 0,
        meditation_seconds INTEGER NOT NULL DEFAULT 0,
        trees_planted INTEGER NOT NULL DEFAULT 0,
        trees_watered INTEGER NOT NULL DEFAULT 0,
        scenes_visited TEXT NOT NULL DEFAULT '[]',
        last_scene TEXT,
        last_x REAL,
        last_y REAL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE player_items (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        source TEXT NOT NULL,
        unlocked_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, item_id)
      );
      CREATE TABLE achievements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        reward_item TEXT,
        sort INTEGER NOT NULL
      );
      CREATE TABLE player_achievements (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL REFERENCES achievements(id),
        unlocked_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, achievement_id)
      );
      CREATE TABLE rooms (
        code TEXT PRIMARY KEY,
        is_private INTEGER NOT NULL DEFAULT 0,
        created_by TEXT REFERENCES players(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE wishes (
        id TEXT PRIMARY KEY,
        room TEXT NOT NULL,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        text TEXT NOT NULL,
        visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX wishes_room_time ON wishes (room, created_at);
      CREATE TABLE wish_reactions (
        wish_id TEXT NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (wish_id, player_id)
      );
      CREATE TABLE reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK (target_type IN ('wish', 'lantern', 'player')),
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (reporter_id, target_type, target_id)
      );
      CREATE TABLE player_blocks (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        blocked_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, blocked_id)
      );
      CREATE TABLE lanterns (
        id TEXT PRIMARY KEY,
        room TEXT NOT NULL,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        text TEXT NOT NULL,
        style TEXT NOT NULL,
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX lanterns_room_time ON lanterns (room, created_at);
      CREATE TABLE gardens (
        player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        visit_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE garden_objects (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES gardens(player_id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        water_count INTEGER NOT NULL DEFAULT 0,
        last_watered_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE quests (
        id TEXT PRIMARY KEY,
        period TEXT NOT NULL CHECK (period IN ('daily', 'weekly')),
        metric TEXT NOT NULL,
        target INTEGER NOT NULL,
        title TEXT NOT NULL,
        reward_item TEXT NOT NULL,
        sort INTEGER NOT NULL
      );
      CREATE TABLE player_quests (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        quest_id TEXT NOT NULL REFERENCES quests(id),
        period_key TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER,
        claimed_at INTEGER,
        PRIMARY KEY (player_id, quest_id, period_key)
      );
      CREATE TABLE meditation_sessions (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        room TEXT NOT NULL,
        planned_seconds INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        actual_seconds INTEGER,
        shared INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX meditation_player ON meditation_sessions (player_id, started_at);
      CREATE TABLE room_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room TEXT NOT NULL,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        joined_at INTEGER NOT NULL,
        left_at INTEGER
      );
      CREATE TABLE sand_patterns (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        strokes TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE journal_entries (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('note', 'event')),
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX journal_player_time ON journal_entries (player_id, created_at);
    `,
  },
];
