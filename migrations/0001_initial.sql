-- Game state (singleton row)
CREATE TABLE IF NOT EXISTS game (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status TEXT NOT NULL DEFAULT 'setup',
  started_at TEXT,
  winner_team_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO game (id, status) VALUES (1, 'setup');

-- Teams (always 2, seeded)
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO teams (id, name) VALUES (1, 'Team 1');
INSERT OR IGNORE INTO teams (id, name) VALUES (2, 'Team 2');

-- Players
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tiles (shared 5×5 grid, 25 total)
CREATE TABLE IF NOT EXISTS tiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position INTEGER NOT NULL UNIQUE CHECK(position >= 1 AND position <= 25),
  type TEXT NOT NULL CHECK(type IN ('drop', 'xp')),
  boss_name TEXT,
  required_drops INTEGER,
  accepted_drops TEXT,
  skill_name TEXT,
  required_xp INTEGER,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Drop submissions
CREATE TABLE IF NOT EXISTS drop_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tile_id INTEGER NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- XP baselines (snapshot taken when competition starts)
CREATE TABLE IF NOT EXISTS xp_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  base_xp INTEGER NOT NULL DEFAULT 0,
  snapshot_taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(player_id, skill_name)
);

-- Pet tile completions (admin awards a free tile to a team)
CREATE TABLE IF NOT EXISTS pet_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tile_id INTEGER NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_id, tile_id)
);
