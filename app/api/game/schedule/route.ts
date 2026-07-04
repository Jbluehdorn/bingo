export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { getGame } from "@/lib/db";

/** POST /api/game/schedule — set or update the scheduled start time.
 *  Body: { scheduled_start_at: string }  (ISO-8601 UTC)
 *  DELETE /api/game/schedule — clear the schedule. */

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const game = await getGame(env.DB);

    if (game.status !== "setup") {
      return Response.json({ error: "Competition has already started." }, { status: 400 });
    }

    const body = (await request.json()) as { scheduled_start_at?: string };
    const raw = body.scheduled_start_at;

    if (!raw || isNaN(Date.parse(raw))) {
      return Response.json({ error: "Invalid date — provide an ISO-8601 UTC string." }, { status: 400 });
    }

    await env.DB.prepare("UPDATE game SET scheduled_start_at = ? WHERE id = 1").bind(raw).run();
    return Response.json({ message: "Start time scheduled.", scheduled_start_at: raw });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to schedule start." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const env = await getEnv();
    await env.DB.prepare("UPDATE game SET scheduled_start_at = NULL WHERE id = 1").run();
    return Response.json({ message: "Schedule cleared." });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to clear schedule." },
      { status: 500 },
    );
  }
}
