export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";

import { getEnv } from "@/lib/cloudflare";
import { resolveStoredImageUrl } from "@/lib/images";

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const formData = await request.formData();
    const file = formData.get("file");
    const rawType = String(formData.get("type") ?? "misc").trim().toLowerCase();
    const type = rawType.replace(/[^a-z0-9-_]/g, "") || "misc";

    if (!(file instanceof File)) {
      return Response.json({ error: "A file is required." }, { status: 400 });
    }

    const key = `uploads/${type}/${randomUUID()}.${getFileExtension(file.name)}`;
    await env.BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    return Response.json({ key, url: resolveStoredImageUrl(key) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to upload file." }, { status: 500 });
  }
}
