export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { getPlayers } from "@/lib/db";
import { validatePlayer } from "@/lib/wom";

export async function GET(request: Request) {
  try {
    const env = await getEnv();
    const url = new URL(request.url);
    const teamId = Number(url.searchParams.get("team_id") ?? "0") || undefined;
    const players = await getPlayers(env.DB, teamId);
    return Response.json({ players });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load players." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const body = (await request.json()) as { team_id?: number; username?: string };
    const teamId = Number(body.team_id);
    const username = body.username?.trim() ?? "";

    if (!teamId || !username) {
      return Response.json({ error: "team_id and username are required." }, { status: 400 });
    }

    if (!(await validatePlayer(username))) {
      return Response.json({ error: "Player was not found on Wise Old Man." }, { status: 400 });
    }

    const existing = await env.DB.prepare("SELECT id FROM players WHERE lower(username) = lower(?)").bind(username).first<{ id: number }>();
    if (existing) {
      return Response.json({ error: "That player is already added." }, { status: 400 });
    }

    await env.DB.prepare("INSERT INTO players (team_id, username) VALUES (?, ?)").bind(teamId, username).run();
    return Response.json({ message: "Player added successfully." }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to add player." }, { status: 500 });
  }
}
