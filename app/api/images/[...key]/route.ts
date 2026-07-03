export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  try {
    const { key } = await context.params;
    if (!key?.length) {
      return Response.json({ error: "Image key is required." }, { status: 400 });
    }

    const env = await getEnv();
    const objectKey = key.join("/");
    const object = await env.BUCKET.get(objectKey);

    if (!object) {
      return Response.json({ error: "Image not found." }, { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load image." }, { status: 500 });
  }
}
