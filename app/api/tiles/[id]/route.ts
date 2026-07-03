export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import type { TileType } from "@/lib/types";

function validateTilePayload(body: {
  position?: number;
  type?: TileType;
  boss_name?: string | null;
  required_drops?: number | null;
  accepted_drops?: string | null;
  skill_name?: string | null;
  required_xp?: number | null;
  image_url?: string | null;
}) {
  const position = Number(body.position);
  if (!position || position < 1 || position > 25) return "Position must be between 1 and 25.";
  if (body.type !== "drop" && body.type !== "xp") return "Tile type must be drop or xp.";
  if (body.type === "drop" && (!body.boss_name?.trim() || !Number(body.required_drops))) return "Drop tiles need a boss and required drops.";
  if (body.type === "xp" && (!body.skill_name?.trim() || !Number(body.required_xp))) return "XP tiles need a skill and required XP.";
  return null;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const tileId = Number(id);
    if (!tileId) return Response.json({ error: "Invalid tile id." }, { status: 400 });

    const body = (await request.json()) as {
      position?: number;
      type?: TileType;
      boss_name?: string | null;
      required_drops?: number | null;
      accepted_drops?: string | null;
      skill_name?: string | null;
      required_xp?: number | null;
      image_url?: string | null;
    };

    const validationError = validateTilePayload(body);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const env = await getEnv();
    await env.DB.prepare(`
      UPDATE tiles
      SET position = ?, type = ?, boss_name = ?, required_drops = ?, accepted_drops = ?, skill_name = ?, required_xp = ?, image_url = ?
      WHERE id = ?
    `).bind(
      Number(body.position),
      body.type,
      body.type === "drop" ? body.boss_name?.trim() ?? null : null,
      body.type === "drop" ? Number(body.required_drops) : null,
      body.type === "drop" ? (body.accepted_drops ?? null) : null,
      body.type === "xp" ? body.skill_name?.trim().toLowerCase() ?? null : null,
      body.type === "xp" ? Number(body.required_xp) : null,
      body.image_url?.trim() ?? null,
      tileId,
    ).run();

    return Response.json({ message: "Tile updated successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to update tile." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const tileId = Number(id);
    if (!tileId) return Response.json({ error: "Invalid tile id." }, { status: 400 });

    const env = await getEnv();
    await env.DB.prepare("DELETE FROM tiles WHERE id = ?").bind(tileId).run();
    return Response.json({ message: "Tile deleted successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to delete tile." }, { status: 500 });
  }
}
