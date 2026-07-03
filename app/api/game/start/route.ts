export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { getGame, getPlayers, getTiles } from "@/lib/db";
import { getPlayerXp, updatePlayer } from "@/lib/wom";

export async function POST() {
  try {
    const env = await getEnv();
    const [game, players, tiles] = await Promise.all([
      getGame(env.DB),
      getPlayers(env.DB),
      getTiles(env.DB),
    ]);

    if (game.status !== "setup") {
      return Response.json({ error: "Competition has already started." }, { status: 400 });
    }

    if (tiles.length !== 25) {
      return Response.json({ error: "Exactly 25 tiles must be configured before starting." }, { status: 400 });
    }

    const team1Players = players.filter((player) => player.team_id === 1);
    const team2Players = players.filter((player) => player.team_id === 2);
    if (!team1Players.length || !team2Players.length) {
      return Response.json({ error: "Each team needs at least one player before starting." }, { status: 400 });
    }

    const xpSkills = Array.from(new Set(tiles.filter((tile) => tile.type === "xp" && tile.skill_name).map((tile) => tile.skill_name!.toLowerCase())));
    await env.DB.prepare("DELETE FROM xp_snapshots").run();

    if (xpSkills.length > 0) {
      for (const player of players) {
        await updatePlayer(player.username);
        const xp = await getPlayerXp(player.username);
        const statements = xpSkills.map((skill) =>
          env.DB
            .prepare(`
              INSERT INTO xp_snapshots (player_id, skill_name, base_xp, snapshot_taken_at)
              VALUES (?, ?, ?, datetime('now'))
              ON CONFLICT(player_id, skill_name) DO UPDATE SET
                base_xp = excluded.base_xp,
                snapshot_taken_at = excluded.snapshot_taken_at
            `)
            .bind(player.id, skill, Number(xp[skill] ?? 0)),
        );
        await env.DB.batch(statements);
      }
    }

    await env.DB
      .prepare("UPDATE game SET status = 'active', started_at = datetime('now'), winner_team_id = NULL WHERE id = 1")
      .run();

    return Response.json({ message: "Competition started successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to start competition." }, { status: 500 });
  }
}
