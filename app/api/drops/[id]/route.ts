export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const dropId = Number(id);
    if (!dropId) return Response.json({ error: "Invalid drop id." }, { status: 400 });

    const env = await getEnv();
    const drop = await env.DB.prepare("SELECT image_url FROM drop_submissions WHERE id = ?").bind(dropId).first<{ image_url: string }>();
    if (!drop) {
      return Response.json({ error: "Drop not found." }, { status: 404 });
    }

    if (drop.image_url && !drop.image_url.startsWith("http")) {
      await env.BUCKET.delete(drop.image_url);
    }

    await env.DB.prepare("DELETE FROM drop_submissions WHERE id = ?").bind(dropId).run();
    return Response.json({ message: "Drop deleted successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to delete drop." }, { status: 500 });
  }
}
