export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";

import { getEnv } from "@/lib/cloudflare";
import { checkForWinner, computeTileProgress, getDropSubmissionsWithDetails, getTileName } from "@/lib/db";
import type { Tile } from "@/lib/types";

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}

export async function GET(request: Request) {
  try {
    const env = await getEnv();
    const url = new URL(request.url);
    const tileId = Number(url.searchParams.get("tile_id") ?? "0") || undefined;
    const teamId = Number(url.searchParams.get("team_id") ?? "0") || undefined;

    let submissions = await getDropSubmissionsWithDetails(env.DB);
    if (tileId) submissions = submissions.filter((submission) => submission.tile_id === tileId);
    if (teamId) submissions = submissions.filter((submission) => submission.team_id === teamId);

    return Response.json({ submissions });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load drops." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const formData = await request.formData();
    const teamId = Number(formData.get("teamId"));
    const playerId = Number(formData.get("playerId"));
    const tileId = Number(formData.get("tileId"));
    const file = formData.get("image");

    if (!teamId || !playerId || !tileId || !(file instanceof File)) {
      return Response.json({ error: "teamId, playerId, tileId, and image are required." }, { status: 400 });
    }

    const [player, tile] = await Promise.all([
      env.DB.prepare("SELECT * FROM players WHERE id = ?").bind(playerId).first<{ id: number; team_id: number; username: string }>(),
      env.DB.prepare("SELECT * FROM tiles WHERE id = ?").bind(tileId).first<Tile>(),
    ]);

    if (!player || player.team_id !== teamId) {
      return Response.json({ error: "Selected player does not belong to that team." }, { status: 400 });
    }

    if (!tile || tile.type !== "drop") {
      return Response.json({ error: "Selected tile must be a drop tile." }, { status: 400 });
    }

    const progress = await computeTileProgress(env.DB, tile, teamId);
    if (progress.is_complete) {
      return Response.json({ error: `${getTileName(tile)} is already complete for this team.` }, { status: 400 });
    }

    const extension = getFileExtension(file.name);
    const key = `drops/${randomUUID()}.${extension}`;
    await env.BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    await env.DB.prepare(`
      INSERT INTO drop_submissions (tile_id, team_id, player_id, image_url)
      VALUES (?, ?, ?, ?)
    `).bind(tileId, teamId, playerId, key).run();

    await checkForWinner(env.DB);
    return Response.json({ message: "Drop logged successfully.", key });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to submit drop." }, { status: 500 });
  }
}
