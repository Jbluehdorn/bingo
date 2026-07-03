export const dynamic = "force-dynamic";

import { getEnv } from "@/lib/cloudflare";
import { getPlayers, getTeams } from "@/lib/db";
import type { TeamWithPlayers } from "@/lib/types";

export async function GET() {
  try {
    const env = await getEnv();
    const [teams, players] = await Promise.all([getTeams(env.DB), getPlayers(env.DB)]);
    const teamsWithPlayers: TeamWithPlayers[] = teams.map((team) => ({
      ...team,
      players: players.filter((player) => player.team_id === team.id),
    }));
    return Response.json({ teams: teamsWithPlayers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load teams." }, { status: 500 });
  }
}
