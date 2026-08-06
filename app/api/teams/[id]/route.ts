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

    const body = (await request.json()) as { name?: string; photo_url?: string | null; pet_image_url?: string | null; pet_name?: string | null; pet_obtained_by?: string | null };
    const nextName = typeof body.name === "string" ? body.name.trim() : team.name;
    const nextPhoto = body.photo_url === undefined ? team.photo_url : body.photo_url;
    const nextPetImage = body.pet_image_url === undefined ? team.pet_image_url : body.pet_image_url;
    const nextPetName = body.pet_name === undefined ? team.pet_name : body.pet_name;
    const nextPetObtainedBy = body.pet_obtained_by === undefined ? team.pet_obtained_by : body.pet_obtained_by;

    if (!nextName) {
      return Response.json({ error: "Team name is required." }, { status: 400 });
    }

    await env.DB.prepare("UPDATE teams SET name = ?, photo_url = ?, pet_image_url = ?, pet_name = ?, pet_obtained_by = ? WHERE id = ?")
      .bind(nextName, nextPhoto, nextPetImage, nextPetName, nextPetObtainedBy, teamId).run();
    return Response.json({ message: "Team updated successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to update team." }, { status: 500 });
  }
}
