export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";

export async function POST() {
  try {
    const env = await getEnv();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM drop_submissions"),
      env.DB.prepare("DELETE FROM xp_snapshots"),
      env.DB.prepare("DELETE FROM pet_completions"),
      env.DB.prepare("DELETE FROM players"),
      env.DB.prepare("DELETE FROM tiles"),
      env.DB.prepare("DELETE FROM teams WHERE id NOT IN (1, 2)"),
      env.DB.prepare("INSERT OR IGNORE INTO teams (id, name, photo_url) VALUES (1, 'Team 1', NULL)"),
      env.DB.prepare("INSERT OR IGNORE INTO teams (id, name, photo_url) VALUES (2, 'Team 2', NULL)"),
      env.DB.prepare("UPDATE teams SET name = CASE WHEN id = 1 THEN 'Team 1' WHEN id = 2 THEN 'Team 2' ELSE name END, photo_url = NULL WHERE id IN (1, 2)"),
      env.DB.prepare("INSERT OR IGNORE INTO game (id, status) VALUES (1, 'setup')"),
      env.DB.prepare("UPDATE game SET status = 'setup', started_at = NULL, winner_team_id = NULL WHERE id = 1"),
    ]);

    return Response.json({ message: "Game reset successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to reset game." }, { status: 500 });
  }
}
