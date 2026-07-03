export const dynamic = "force-dynamic";

import { validatePlayer } from "@/lib/wom";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get("username")?.trim() ?? "";
    if (!username) {
      return Response.json({ error: "username is required." }, { status: 400 });
    }

    const valid = await validatePlayer(username);
    return Response.json({ valid });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to validate player." }, { status: 500 });
  }
}
