export const dynamic = "force-dynamic";

import Link from "next/link";

import BingoBoard from "@/components/BingoBoard";
import { getEnv } from "@/lib/cloudflare";
import { computeAllTilesProgress, getGame, getTeamById, getTeams, getTiles } from "@/lib/db";

function StatusBanner({
  status,
  winnerName,
}: {
  status: "setup" | "active" | "completed";
  winnerName?: string | null;
}) {
  const config =
    status === "setup"
      ? {
          className: "border-osrs-border bg-osrs-panel",
          text: "Waiting for admin to start",
        }
      : status === "active"
        ? {
            className: "border-osrs-green-border bg-osrs-green/70",
            text: "Competition is LIVE!",
          }
        : {
            className: "border-yellow-600 bg-yellow-950/70",
            text: `🏆 ${winnerName ?? "A team"} wins!`,
          };

  return (
    <div className={`rounded border px-4 py-3 text-center font-semibold ${config.className}`}>
      {config.text}
    </div>
  );
}

export default async function HomePage() {
  const env = await getEnv();
  const [game, teams, tiles] = await Promise.all([
    getGame(env.DB),
    getTeams(env.DB),
    getTiles(env.DB),
  ]);

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

      <StatusBanner status={game.status} winnerName={winner?.name} />

      <div className="flex justify-center">
        <Link href="/" className="osrs-button inline-flex items-center gap-2">
          Refresh Progress
        </Link>
      </div>

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
    </div>
  );
}
