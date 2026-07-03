export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { getTeamById } from "@/lib/db";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const teamId = Number(id);
    if (!teamId) {
      return Response.json({ error: "Invalid team id." }, { status: 400 });
    }

    const env = await getEnv();
    const team = await getTeamById(env.DB, teamId);
    if (!team) {
      return Response.json({ error: "Team not found." }, { status: 404 });
    }

    const body = (await request.json()) as { name?: string; photo_url?: string | null };
    const nextName = typeof body.name === "string" ? body.name.trim() : team.name;
    const nextPhoto = body.photo_url === undefined ? team.photo_url : body.photo_url;

    if (!nextName) {
      return Response.json({ error: "Team name is required." }, { status: 400 });
    }

    await env.DB.prepare("UPDATE teams SET name = ?, photo_url = ? WHERE id = ?").bind(nextName, nextPhoto, teamId).run();
    return Response.json({ message: "Team updated successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to update team." }, { status: 500 });
  }
}
