export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const playerId = Number(id);
    if (!playerId) {
      return Response.json({ error: "Invalid player id." }, { status: 400 });
    }

    const env = await getEnv();
    await env.DB.prepare("DELETE FROM players WHERE id = ?").bind(playerId).run();
    return Response.json({ message: "Player removed successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to delete player." }, { status: 500 });
  }
}
