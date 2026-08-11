-- Cache Wise Old Man XP gains across visitors to limit API requests
CREATE TABLE IF NOT EXISTS xp_progress_cache (
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  xp_by_skill TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (player_id, started_at)
);
