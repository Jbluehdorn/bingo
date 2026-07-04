import type {
  DropSubmission,
  DropSubmissionWithDetails,
  Game,
  PetCompletion,
  Player,
  Team,
  TeamTileProgress,
  Tile,
  TileWithProgress,
  XpSnapshot,
} from "@/lib/types";
import { getPlayerXp } from "@/lib/wom";

function allResults<T>(statement: D1PreparedStatement): Promise<T[]> {
  return statement.all<T>().then((result) => result.results ?? []);
}

function buildInClause(size: number): string {
  return Array.from({ length: size }, () => "?").join(", ");
}

export async function getGame(db: D1Database): Promise<Game> {
  const game = await db.prepare("SELECT * FROM game WHERE id = 1").first<Game>();
  if (game) return game;

  await db.prepare("INSERT OR IGNORE INTO game (id, status) VALUES (1, 'setup')").run();
  return (await db.prepare("SELECT * FROM game WHERE id = 1").first<Game>()) as Game;
}

export async function getTeams(db: D1Database): Promise<Team[]> {
  return allResults<Team>(db.prepare("SELECT * FROM teams ORDER BY id ASC"));
}

export async function getTeamById(db: D1Database, id: number): Promise<Team | null> {
  return (await db.prepare("SELECT * FROM teams WHERE id = ?").bind(id).first<Team>()) ?? null;
}

export async function getPlayers(db: D1Database, teamId?: number): Promise<Player[]> {
  if (teamId) {
    return allResults<Player>(
      db.prepare("SELECT * FROM players WHERE team_id = ? ORDER BY username COLLATE NOCASE ASC").bind(teamId),
    );
  }

  return allResults<Player>(
    db.prepare("SELECT * FROM players ORDER BY team_id ASC, username COLLATE NOCASE ASC"),
  );
}

export async function getTiles(db: D1Database): Promise<Tile[]> {
  return allResults<Tile>(db.prepare("SELECT * FROM tiles ORDER BY position ASC"));
}

export async function getDropSubmissions(
  db: D1Database,
  tileId?: number,
  teamId?: number,
): Promise<DropSubmission[]> {
  const clauses: string[] = [];
  const values: number[] = [];

  if (tileId) {
    clauses.push("tile_id = ?");
    values.push(tileId);
  }

  if (teamId) {
    clauses.push("team_id = ?");
    values.push(teamId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return allResults<DropSubmission>(
    db
      .prepare(`SELECT * FROM drop_submissions ${where} ORDER BY submitted_at DESC, id DESC`)
      .bind(...values),
  );
}

export async function getDropSubmissionsWithDetails(
  db: D1Database,
): Promise<DropSubmissionWithDetails[]> {
  return allResults<DropSubmissionWithDetails>(
    db.prepare(`
      SELECT
        ds.*,
        p.username AS player_username,
        t.name AS team_name,
        CASE
          WHEN tile.type = 'drop' THEN COALESCE(tile.boss_name, 'Drop Tile')
          ELSE COALESCE(tile.skill_name, 'XP Tile')
        END AS tile_name
      FROM drop_submissions ds
      INNER JOIN players p ON p.id = ds.player_id
      INNER JOIN teams t ON t.id = ds.team_id
      INNER JOIN tiles tile ON tile.id = ds.tile_id
      ORDER BY ds.submitted_at DESC, ds.id DESC
    `),
  );
}

export async function getXpSnapshots(
  db: D1Database,
  playerIds?: number[],
): Promise<XpSnapshot[]> {
  if (!playerIds?.length) {
    return allResults<XpSnapshot>(db.prepare("SELECT * FROM xp_snapshots ORDER BY player_id ASC"));
  }

  const inClause = buildInClause(playerIds.length);
  return allResults<XpSnapshot>(
    db.prepare(`SELECT * FROM xp_snapshots WHERE player_id IN (${inClause}) ORDER BY player_id ASC`).bind(
      ...playerIds,
    ),
  );
}

export async function getPetCompletions(db: D1Database): Promise<PetCompletion[]> {
  return allResults<PetCompletion>(db.prepare("SELECT * FROM pet_completions"));
}

function buildEmptyProgress(teamId: number): TeamTileProgress {
  return {
    team_id: teamId,
    is_complete: false,
    pet_completed: false,
    current_drops: 0,
    current_xp: 0,
    contributors: [],
  };
}

export async function computeTileProgress(
  db: D1Database,
  tile: Tile,
  teamId: number,
): Promise<TeamTileProgress> {
  const [progress] = await computeAllTilesProgress(db, [tile]);
  if (!progress) return buildEmptyProgress(teamId);
  if (progress.team1.team_id === teamId) return progress.team1;
  if (progress.team2.team_id === teamId) return progress.team2;
  return buildEmptyProgress(teamId);
}

export async function computeAllTilesProgress(
  db: D1Database,
  tiles: Tile[],
): Promise<TileWithProgress[]> {
  const [teams, players, drops, snapshots, petCompletions] = await Promise.all([
    getTeams(db),
    getPlayers(db),
    getDropSubmissions(db),
    getXpSnapshots(db),
    getPetCompletions(db),
  ]);

  const primaryTeam = teams.find((team) => team.id === 1) ?? teams[0] ?? { id: 1 };
  const secondaryTeam = teams.find((team) => team.id === 2) ?? teams[1] ?? { id: 2 };
  const teamIds = [primaryTeam.id, secondaryTeam.id];
  const teamPlayers = new Map<number, Player[]>();
  for (const teamId of teamIds) {
    teamPlayers.set(
      teamId,
      players.filter((player) => player.team_id === teamId),
    );
  }

  const dropCountMap = new Map<string, number>();
  const dropContributorsMap = new Map<string, string[]>();
  // Iterate oldest-first so the contributors list is in chronological drop order
  for (const drop of [...drops].reverse()) {
    const key = `${drop.tile_id}:${drop.team_id}`;
    dropCountMap.set(key, (dropCountMap.get(key) ?? 0) + 1);
    const player = players.find((p) => p.id === drop.player_id);
    if (player) {
      if (!dropContributorsMap.has(key)) dropContributorsMap.set(key, []);
      dropContributorsMap.get(key)!.push(player.username);
    }
  }

  const petSet = new Set(petCompletions.map((item) => `${item.tile_id}:${item.team_id}`));
  const snapshotMap = new Map(
    snapshots.map((snapshot) => [`${snapshot.player_id}:${snapshot.skill_name.toLowerCase()}`, snapshot.base_xp]),
  );

  const xpByPlayer = new Map<number, Record<string, number>>();
  if (tiles.some((tile) => tile.type === "xp") && players.length > 0) {
    const xpResults = await Promise.all(
      players.map(async (player) => {
        try {
          return [player.id, await getPlayerXp(player.username)] as const;
        } catch {
          return [player.id, {}] as const;
        }
      }),
    );

    for (const [playerId, xp] of xpResults) {
      xpByPlayer.set(playerId, xp);
    }
  }

  return tiles.map((tile) => {
    const buildProgressForTeam = (teamId: number): TeamTileProgress => {
      const petCompleted = petSet.has(`${tile.id}:${teamId}`);
      const currentDrops = dropCountMap.get(`${tile.id}:${teamId}`) ?? 0;

      let currentXp = 0;
      if (tile.type === "xp" && tile.skill_name) {
        const skillName = tile.skill_name.toLowerCase();
        currentXp = (teamPlayers.get(teamId) ?? []).reduce((total, player) => {
          const current = Number(xpByPlayer.get(player.id)?.[skillName] ?? 0);
          const baseline = Number(snapshotMap.get(`${player.id}:${skillName}`) ?? 0);
          return total + Math.max(0, current - baseline);
        }, 0);
      }

      const dropComplete =
        tile.type === "drop" ? currentDrops >= Number(tile.required_drops ?? 0) : false;
      const xpComplete = tile.type === "xp" ? currentXp >= Number(tile.required_xp ?? 0) : false;

      return {
        team_id: teamId,
        is_complete: petCompleted || dropComplete || xpComplete,
        pet_completed: petCompleted,
        current_drops: currentDrops,
        current_xp: currentXp,
        contributors: dropContributorsMap.get(`${tile.id}:${teamId}`) ?? [],
      };
    };

    return {
      tile,
      team1: buildProgressForTeam(primaryTeam.id),
      team2: buildProgressForTeam(secondaryTeam.id),
    };
  });
}

export async function checkForWinner(db: D1Database): Promise<number | null> {
  const game = await getGame(db);
  if (game.status === "setup") return null;

  const tiles = await getTiles(db);
  if (tiles.length !== 25) return null;

  const progress = await computeAllTilesProgress(db, tiles);
  const team1Complete = progress.every((tile) => tile.team1.is_complete);
  const team2Complete = progress.every((tile) => tile.team2.is_complete);
  const winnerId = team1Complete
    ? progress[0]?.team1.team_id ?? 1
    : team2Complete
      ? progress[0]?.team2.team_id ?? 2
      : null;

  if (!winnerId || game.status === "completed") {
    return winnerId;
  }

  await db
    .prepare("UPDATE game SET status = 'completed', winner_team_id = ? WHERE id = 1")
    .bind(winnerId)
    .run();

  return winnerId;
}

export function getTileName(tile: Tile): string {
  return tile.type === "drop" ? tile.boss_name ?? "Drop Tile" : tile.skill_name ?? "XP Tile";
}
