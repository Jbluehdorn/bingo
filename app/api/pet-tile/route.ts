export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { checkForWinner } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const body = (await request.json()) as { team_id?: number; tile_id?: number };
    const teamId = Number(body.team_id);
    const tileId = Number(body.tile_id);

    if (!teamId || !tileId) {
      return Response.json({ error: "team_id and tile_id are required." }, { status: 400 });
    }

    const existing = await env.DB.prepare("SELECT id FROM pet_completions WHERE team_id = ? AND tile_id = ?").bind(teamId, tileId).first<{ id: number }>();
    if (existing) {
      return Response.json({ error: "That pet completion is already awarded." }, { status: 400 });
    }

    await env.DB.prepare("INSERT INTO pet_completions (team_id, tile_id) VALUES (?, ?)").bind(teamId, tileId).run();
    await checkForWinner(env.DB);
    return Response.json({ message: "Pet tile awarded successfully." }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to award pet tile." }, { status: 500 });
  }
}
