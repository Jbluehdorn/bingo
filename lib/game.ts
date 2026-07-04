import { getPlayers, getTiles } from "@/lib/db";
import { getPlayerXp, updatePlayer } from "@/lib/wom";

/** Shared start logic — called by the API route and the auto-trigger on page load. */
export async function performStart(db: D1Database): Promise<{ error?: string; message?: string }> {
  const [players, tiles] = await Promise.all([getPlayers(db), getTiles(db)]);

  if (tiles.length !== 25) {
    return { error: "Exactly 25 tiles must be configured before starting." };
  }

  const team1Players = players.filter((p) => p.team_id === 1);
  const team2Players = players.filter((p) => p.team_id === 2);
  if (!team1Players.length || !team2Players.length) {
    return { error: "Each team needs at least one player before starting." };
  }

  const xpSkills = Array.from(
    new Set(tiles.filter((t) => t.type === "xp" && t.skill_name).map((t) => t.skill_name!.toLowerCase())),
  );
  await db.prepare("DELETE FROM xp_snapshots").run();

  if (xpSkills.length > 0) {
    for (const player of players) {
      await updatePlayer(player.username);
      const xp = await getPlayerXp(player.username);
      const statements = xpSkills.map((skill) =>
        db
          .prepare(
            `INSERT INTO xp_snapshots (player_id, skill_name, base_xp, snapshot_taken_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(player_id, skill_name) DO UPDATE SET
               base_xp = excluded.base_xp,
               snapshot_taken_at = excluded.snapshot_taken_at`,
          )
          .bind(player.id, skill, Number(xp[skill] ?? 0)),
      );
      await db.batch(statements);
    }
  }

  // Use the scheduled start time as started_at if it was set, otherwise now.
  await db
    .prepare(
      `UPDATE game
       SET status = 'active',
           started_at = COALESCE(scheduled_start_at, datetime('now')),
           scheduled_start_at = NULL
       WHERE id = 1`,
    )
    .run();

  return { message: "Competition started successfully." };
}
