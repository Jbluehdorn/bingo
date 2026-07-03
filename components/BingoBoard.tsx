"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { getTileImageUrl, resolveStoredImageUrl } from "@/lib/images";
import { getTileDisplayName, parseTileAcceptedDrops } from "@/lib/types";
import type { Team, TileWithProgress } from "@/lib/types";

interface BingoBoardProps {
  tiles: TileWithProgress[];
  team: Team;
  teamIndex: 0 | 1;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function BoardMiniTile({
  tile,
  isComplete,
  progressText,
  petCompleted,
}: {
  tile: TileWithProgress["tile"];
  isComplete: boolean;
  progressText: string;
  petCompleted: boolean;
}) {
  const initialSrc = useMemo(() => resolveStoredImageUrl(getTileImageUrl(tile)), [tile]);
  const [imageSrc, setImageSrc] = useState(initialSrc);
  const acceptedDrops = useMemo(() => parseTileAcceptedDrops(tile), [tile]);

  return (
    <div
      className={`group relative flex min-h-34 flex-col gap-2 rounded border p-2 ${
        isComplete
          ? "border-osrs-green-border bg-osrs-green/80"
          : "border-osrs-red-border bg-osrs-red/70"
      }`}
    >
      <div className="text-[10px] font-semibold text-osrs-text-muted">#{tile.position}</div>
      <div className="relative h-14 overflow-hidden rounded border border-osrs-border bg-osrs-panel-dark">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={getTileDisplayName(tile)}
            fill
            sizes="96px"
            className="object-contain p-1"
            unoptimized
            onError={() => setImageSrc("")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xl">🎯</div>
        )}
      </div>
      <div className="min-h-10">
        <div className="line-clamp-2 text-xs font-semibold text-osrs-text-bright">
          {getTileDisplayName(tile)}
        </div>
        <div className="text-[11px] text-osrs-text">{progressText}</div>
        {petCompleted ? (
          <span className="mt-1 inline-block rounded bg-yellow-700 px-1.5 py-0.5 text-[10px] text-yellow-100">
            🐾 Pet!
          </span>
        ) : null}
      </div>

      {/* Accepted drops tooltip — only shown for drop tiles with configured drops */}
      {tile.type === "drop" && acceptedDrops.length > 0 && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded border border-osrs-border bg-osrs-panel p-2 text-xs opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
          <div className="mb-1.5 font-semibold text-osrs-text-bright">Accepted Drops</div>
          <ul className="flex flex-col gap-0.5">
            {acceptedDrops.map((drop) => (
              <li key={drop} className="text-osrs-text">• {drop}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function BingoBoard({ tiles, team, teamIndex }: BingoBoardProps) {
  const teamTiles = tiles.map((tile) => (teamIndex === 0 ? tile.team1 : tile.team2));
  const completeCount = teamTiles.filter((tile) => tile.is_complete).length;

  return (
    <section className="osrs-panel flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 border-osrs-border bg-osrs-panel-dark">
          {team.photo_url ? (
            <Image
              src={resolveStoredImageUrl(team.photo_url)}
              alt={team.name}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">🛡️</div>
          )}
        </div>
        <div className="flex flex-1 items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl">{team.name}</h2>
            <p className="text-sm text-osrs-text-muted">{completeCount}/25 tiles complete</p>
          </div>
          <Link
            href={`/log-drop?team=${team.id}`}
            className="osrs-button shrink-0 text-sm"
          >
            Log a Drop
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((entry) => {
          const progress = teamIndex === 0 ? entry.team1 : entry.team2;
          const progressText = entry.tile.type === "drop"
            ? `${progress.current_drops}/${entry.tile.required_drops ?? 0} drops`
            : `${formatNumber(progress.current_xp)} / ${formatNumber(entry.tile.required_xp ?? 0)} xp`;

          return (
            <BoardMiniTile
              key={entry.tile.id}
              tile={entry.tile}
              isComplete={progress.is_complete}
              progressText={progressText}
              petCompleted={progress.pet_completed}
            />
          );
        })}
      </div>
    </section>
  );
}
