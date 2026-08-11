export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { checkForWinner, computeAllTilesProgress, getGame, getTiles } from "@/lib/db";

export async function GET() {
  try {
    const env = await getEnv();
    const [game, tiles] = await Promise.all([
      getGame(env.DB),
      getTiles(env.DB),
    ]);

    if (game.status === "setup") {
      return Response.json({ error: "Competition has not started yet." }, { status: 400 });
    }

    const xpTiles = tiles.filter((tile) => tile.type === "xp");
    if (!xpTiles.length) {
      return Response.json({ tiles: [] });
    }

    const progress = await computeAllTilesProgress(env.DB, xpTiles);
    await checkForWinner(env.DB);
    return Response.json({ tiles: progress });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to fetch XP progress." }, { status: 500 });
  }
}
