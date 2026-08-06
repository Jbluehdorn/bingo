"use client";

import { useState } from "react";

import BingoBoard from "@/components/BingoBoard";
import TileCard from "@/components/TileCard";
import type { TeamWithPlayers, TileWithProgress } from "@/lib/types";

interface BoardDisplayProps {
  teams: [TeamWithPlayers, TeamWithPlayers];
  tiles: TileWithProgress[];
}

export default function BoardDisplay({ teams, tiles }: BoardDisplayProps) {
  const [view, setView] = useState<"teams" | "comparison">("teams");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <div className="inline-flex rounded border border-osrs-border bg-osrs-panel-dark p-1">
          <button
            type="button"
            className={`rounded px-4 py-2 text-sm font-semibold ${
              view === "teams"
                ? "bg-osrs-button text-osrs-text-bright"
                : "text-osrs-text-muted hover:text-osrs-text"
            }`}
            onClick={() => setView("teams")}
          >
            Team Boards
          </button>
          <button
            type="button"
            className={`rounded px-4 py-2 text-sm font-semibold ${
              view === "comparison"
                ? "bg-osrs-button text-osrs-text-bright"
                : "text-osrs-text-muted hover:text-osrs-text"
            }`}
            onClick={() => setView("comparison")}
          >
            Head-to-Head
          </button>
        </div>
      </div>

      {view === "teams" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {teams.map((team, index) => (
            <BingoBoard key={team.id} tiles={tiles} team={team} teamIndex={index as 0 | 1} />
          ))}
        </div>
      ) : (
        <section className="osrs-panel flex flex-col gap-4 p-4">
          <div className="text-center">
            <h2 className="text-2xl">Head-to-Head Board</h2>
            <p className="text-sm text-osrs-text-muted">
              Each tile shows both teams&apos; progress side by side.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tiles.map((entry) => (
              <TileCard
                key={entry.tile.id}
                tile={entry.tile}
                team1Progress={entry.team1}
                team2Progress={entry.team2}
                teamNames={[teams[0].name, teams[1].name]}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
