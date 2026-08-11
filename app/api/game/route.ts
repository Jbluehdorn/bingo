export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { getGame, getPlayers, getTeamById, getTeams, getTiles } from "@/lib/db";
import type { TeamWithPlayers } from "@/lib/types";

export async function GET() {
  try {
    const env = await getEnv();
    const [game, teams, players, tiles] = await Promise.all([
      getGame(env.DB),
      getTeams(env.DB),
      getPlayers(env.DB),
      getTiles(env.DB),
    ]);

    const teamsWithPlayers: TeamWithPlayers[] = teams.map((team) => ({
      ...team,
      players: players.filter((player) => player.team_id === team.id),
    }));
    const winner = game.winner_team_id ? await getTeamById(env.DB, game.winner_team_id) : null;

    return Response.json({
      game,
      teams: teamsWithPlayers,
      tiles,
      tileCount: tiles.length,
      playerCounts: Object.fromEntries(teams.map((team) => [team.id, players.filter((player) => player.team_id === team.id).length])),
      winnerName: winner?.name ?? null,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load game." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const env = await getEnv();
    const body = (await request.json()) as { pet_tile_rules?: string | null };

    if (body.pet_tile_rules === undefined) {
      return Response.json({ error: "pet_tile_rules is required." }, { status: 400 });
    }

    const petTileRules = body.pet_tile_rules?.trim() || null;
    await env.DB.prepare("UPDATE game SET pet_tile_rules = ? WHERE id = 1").bind(petTileRules).run();
    return Response.json({ message: "Pet tile rules updated successfully." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to update game." }, { status: 500 });
  }
}
