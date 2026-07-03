export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { computeAllTilesProgress, getTiles } from "@/lib/db";
import type { TileType } from "@/lib/types";

function validateTilePayload(body: {
  position?: number;
  type?: TileType;
  boss_name?: string | null;
  required_drops?: number | null;
  skill_name?: string | null;
  required_xp?: number | null;
  image_url?: string | null;
}) {
  const position = Number(body.position);
  if (!position || position < 1 || position > 25) {
    return "Position must be between 1 and 25.";
  }

  if (body.type !== "drop" && body.type !== "xp") {
    return "Tile type must be drop or xp.";
  }

  if (body.type === "drop") {
    if (!body.boss_name?.trim()) return "Boss name is required for drop tiles.";
    if (!Number(body.required_drops) || Number(body.required_drops) < 1) return "Required drops must be at least 1.";
  }

  if (body.type === "xp") {
    if (!body.skill_name?.trim()) return "Skill name is required for xp tiles.";
    if (!Number(body.required_xp) || Number(body.required_xp) < 1) return "Required XP must be at least 1.";
  }

  return null;
}

export async function GET() {
  try {
    const env = await getEnv();
    const tiles = await getTiles(env.DB);
    const progress = await computeAllTilesProgress(env.DB, tiles);
    return Response.json({ tiles: progress });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load tiles." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const body = (await request.json()) as {
      position?: number;
      type?: TileType;
      boss_name?: string | null;
      required_drops?: number | null;
      skill_name?: string | null;
      required_xp?: number | null;
      image_url?: string | null;
    };

    const validationError = validateTilePayload(body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const existing = await env.DB.prepare("SELECT id FROM tiles WHERE position = ?").bind(Number(body.position)).first<{ id: number }>();
    if (existing) {
      await env.DB.prepare(`
        UPDATE tiles
        SET type = ?, boss_name = ?, required_drops = ?, skill_name = ?, required_xp = ?, image_url = ?
        WHERE id = ?
      `).bind(
        body.type,
        body.type === "drop" ? body.boss_name?.trim() ?? null : null,
        body.type === "drop" ? Number(body.required_drops) : null,
        body.type === "xp" ? body.skill_name?.trim().toLowerCase() ?? null : null,
        body.type === "xp" ? Number(body.required_xp) : null,
        body.image_url?.trim() ?? null,
        existing.id,
      ).run();
      return Response.json({ message: "Tile updated successfully." });
    }

    await env.DB.prepare(`
      INSERT INTO tiles (position, type, boss_name, required_drops, skill_name, required_xp, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      Number(body.position),
      body.type,
      body.type === "drop" ? body.boss_name?.trim() ?? null : null,
      body.type === "drop" ? Number(body.required_drops) : null,
      body.type === "xp" ? body.skill_name?.trim().toLowerCase() ?? null : null,
      body.type === "xp" ? Number(body.required_xp) : null,
      body.image_url?.trim() ?? null,
    ).run();

    return Response.json({ message: "Tile created successfully." }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to save tile." }, { status: 500 });
  }
}
