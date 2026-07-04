export const dynamic = "force-dynamic";

import Link from "next/link";

import BingoBoard from "@/components/BingoBoard";
import StartCountdown from "@/components/StartCountdown";
import { getEnv } from "@/lib/cloudflare";
import { computeAllTilesProgress, getGame, getTeamById, getTeams, getTiles } from "@/lib/db";
import { performStart } from "@/lib/game";

function StatusBanner({
  status,
  winnerName,
  scheduledStartAt,
}: {
  status: "setup" | "active" | "completed";
  winnerName?: string | null;
  scheduledStartAt?: string | null;
}) {
  if (status === "active") {
    return (
      <div className="rounded border border-osrs-green-border bg-osrs-green/70 px-4 py-3 text-center font-semibold">
        Competition is LIVE!
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="rounded border border-yellow-600 bg-yellow-950/70 px-4 py-3 text-center font-semibold">
        🏆 {winnerName ?? "A team"} wins!
      </div>
    );
  }

  // setup
  if (scheduledStartAt) {
    return (
      <div className="rounded border border-osrs-border bg-osrs-panel px-4 py-3 text-center font-semibold">
      <StartCountdown targetUtc={scheduledStartAt} />
      </div>
    );
  }

  return (
    <div className="rounded border border-osrs-border bg-osrs-panel px-4 py-3 text-center font-semibold">
      Waiting for admin to start
    </div>
  );
}

export default async function HomePage() {
  const env = await getEnv();
  let game = await getGame(env.DB);

  // Auto-transition: if scheduled start has passed and game is still in setup, trigger start.
  if (
    game.status === "setup" &&
    game.scheduled_start_at &&
    new Date(game.scheduled_start_at) <= new Date()
  ) {
    await performStart(env.DB);
    game = await getGame(env.DB);
  }

  const [teams, tiles] = await Promise.all([getTeams(env.DB), getTiles(env.DB)]);

  const orderedTeams = [
    teams.find((team) => team.id === 1) ?? teams[0],
    teams.find((team) => team.id === 2) ?? teams[1],
  ].filter(Boolean);
  const progress = await computeAllTilesProgress(env.DB, tiles);
  const winner = game.winner_team_id ? await getTeamById(env.DB, game.winner_team_id) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl">OSRS Bingo</h1>
        <p className="text-osrs-text-muted">
          Two teams race across one shared 5×5 board. First to all 25 tiles wins.
        </p>
      </div>

      <StatusBanner
        status={game.status}
        winnerName={winner?.name}
        scheduledStartAt={
          // Only pass a future scheduled time — if it's already past (auto-start failed),
          // don't show a countdown or we get an infinite reload loop.
          game.scheduled_start_at && new Date(game.scheduled_start_at) > new Date()
            ? game.scheduled_start_at
            : null
        }
      />

      {orderedTeams.length === 2 && progress.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {orderedTeams.map((team, index) => (
            <BingoBoard key={team.id} tiles={progress} team={team} teamIndex={index as 0 | 1} />
          ))}
        </div>
      ) : (
        <div className="osrs-panel p-6 text-center text-osrs-text-muted">
          Configure all 25 tiles in the admin panel to see the live boards.
        </div>
      )}

      <div className="flex justify-center">
        <Link href="/" className="osrs-button inline-flex items-center gap-2">
          ↻ Refresh Progress
        </Link>
      </div>
    </div>
  );
}
