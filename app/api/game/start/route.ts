export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { getGame } from "@/lib/db";
import { performStart } from "@/lib/game";

export async function POST() {
  try {
    const env = await getEnv();
    const game = await getGame(env.DB);

    if (game.status !== "setup") {
      return Response.json({ error: "Competition has already started." }, { status: 400 });
    }

    const result = await performStart(env.DB);
    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ message: result.message });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to start competition." }, { status: 500 });
  }
}
