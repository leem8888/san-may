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
  {
    version: 2,
    name: 'shared room sand garden',
    up: `CREATE TABLE room_sand (
      room TEXT PRIMARY KEY,
      strokes TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
  },
  {
    version: 3,
    name: 'temple stall and offerings',
    up: `
      CREATE TABLE shop_wallets (
        player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        points INTEGER NOT NULL DEFAULT 100 CHECK(points >= 0),
        claimed_day TEXT NOT NULL
      );
      CREATE TABLE shop_inventory (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        sku TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
        PRIMARY KEY(player_id, sku)
      );
      CREATE TABLE shop_orders (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        request_id TEXT NOT NULL,
        sku TEXT NOT NULL,
        PRIMARY KEY(player_id, request_id)
      );
      CREATE TABLE temple_offerings (
        id TEXT PRIMARY KEY,
        room TEXT NOT NULL,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sku TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX temple_offerings_room_time ON temple_offerings(room, created_at);
    `,
  },
  {
    version: 4,
    name: 'world state, stories, dialogue memory and npc relationships',
    up: `
      -- One row per (scope, owner, scene, object, type). owner is a player id (personal), a room code (room) or 'world' (shared).
      CREATE TABLE world_state (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL CHECK (scope IN ('personal', 'room', 'shared')),
        owner TEXT NOT NULL,
        scene_id TEXT NOT NULL,
        object_id TEXT NOT NULL,
        state_type TEXT NOT NULL,
        value TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER
      );
      CREATE INDEX world_state_lookup ON world_state (scope, owner, scene_id);
      CREATE INDEX world_state_expiry ON world_state (expires_at) WHERE expires_at IS NOT NULL;
      CREATE TABLE story_progress (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        story_id TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        step TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
        started_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER,
        PRIMARY KEY (player_id, story_id)
      );
      CREATE TABLE story_flags (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        flag TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, flag)
      );
      CREATE TABLE dialogue_choices (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        npc_id TEXT NOT NULL,
        choice_key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, npc_id, choice_key)
      );
      CREATE TABLE npc_relationships (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        npc_id TEXT NOT NULL,
        met_at INTEGER NOT NULL,
        talks INTEGER NOT NULL DEFAULT 0,
        familiarity INTEGER NOT NULL DEFAULT 0,
        last_talk_day TEXT,
        activities TEXT NOT NULL DEFAULT '[]',
        PRIMARY KEY (player_id, npc_id)
      );
      -- Story beats the player has lived through, so the journal can retell each chapter.
      CREATE TABLE story_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        story_id TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX story_log_player ON story_log (player_id, story_id, id);
    `,
  },
  {
    version: 5,
    name: 'cooperative sessions and shared memories',
    up: `
      -- Finished two-person activities (live sessions stay in memory; only the outcome is kept).
      CREATE TABLE coop_sessions (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL,
        kind TEXT NOT NULL,
        host_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        guest_id TEXT REFERENCES players(id) ON DELETE SET NULL,
        status TEXT NOT NULL,
        result TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        ended_at INTEGER NOT NULL
      );
      CREATE INDEX coop_sessions_host ON coop_sessions (host_id, ended_at);
      CREATE INDEX coop_sessions_guest ON coop_sessions (guest_id, ended_at);
      -- A memory each participant keeps of a completed activity.
      CREATE TABLE shared_memories (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES coop_sessions(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        partner_name TEXT,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX shared_memories_player ON shared_memories (player_id, created_at);
    `,
  },
  {
    version: 6,
    name: 'journey telemetry',
    up: `
      -- Privacy-first journey telemetry: a one-way player key, event names, stage numbers and active seconds only.
      -- Never chat, prayers, written answers or names.
      CREATE TABLE journey_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journey TEXT NOT NULL,
        player_key TEXT NOT NULL,
        event TEXT NOT NULL,
        stage INTEGER,
        seconds INTEGER,
        solo INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX journey_events_key ON journey_events (journey, player_key, created_at);
    `,
  },
  {
    version: 7,
    name: 'main hall: bow sessions, reading marks, prayer book',
    up: `
      -- A chosen bowing session (9/27/54/108); the existing 108 round counters keep working alongside it.
      CREATE TABLE practice_sessions (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('bow', 'bead')),
        target INTEGER NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'ended')),
        started_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX practice_sessions_player ON practice_sessions (player_id, status);
      -- Where the reader stopped in each text, and their bookmarks.
      CREATE TABLE reading_marks (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        bookmarks TEXT NOT NULL DEFAULT '[]',
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, item_id)
      );
      -- The Main Hall prayer book reuses wishes: same privacy, moderation and reports, a different kind.
      ALTER TABLE wishes ADD COLUMN kind TEXT NOT NULL DEFAULT 'wish';
      CREATE INDEX wishes_room_kind ON wishes (room, kind, created_at);
    `,
  },
  {
    version: 8,
    name: 'fish release requests',
    up: `
      CREATE TABLE fish_releases (
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        request_id TEXT NOT NULL,
        scene_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, request_id)
      );
    `,
  },
  {
    version: 9,
    name: 'temple life profile state',
    up: `
      ALTER TABLE player_profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female'));
      ALTER TABLE player_profiles ADD COLUMN is_shaved INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE player_profiles ADD COLUMN footwear TEXT NOT NULL DEFAULT 'wearing' CHECK (footwear IN ('wearing', 'stored'));
    `,
  },
];
