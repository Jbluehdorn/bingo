"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { getTileImageUrl, resolveStoredImageUrl } from "@/lib/images";
import type { TeamTileProgress, Tile } from "@/lib/types";

interface TileCardProps {
  tile: Tile;
  team1Progress: TeamTileProgress;
  team2Progress: TeamTileProgress;
  teamNames: [string, string];
}

function formatValue(value: number): string {
  return value.toLocaleString();
}

export default function TileCard({
  tile,
  team1Progress,
  team2Progress,
  teamNames,
}: TileCardProps) {
  const initialImage = useMemo(() => resolveStoredImageUrl(getTileImageUrl(tile)), [tile]);
  const [imageSrc, setImageSrc] = useState(initialImage);

  const bgClass = team1Progress.is_complete && team2Progress.is_complete
    ? "bg-osrs-green border-osrs-green-border"
    : !team1Progress.is_complete && !team2Progress.is_complete
      ? "bg-osrs-red border-osrs-red-border"
      : "border-yellow-700 bg-yellow-950/60";

  const title = tile.type === "drop" ? tile.boss_name : tile.skill_name;
  const goal = tile.type === "drop"
    ? `${tile.required_drops ?? 0} uniques`
    : `${formatValue(tile.required_xp ?? 0)} XP`;

  const renderTeamRow = (label: string, progress: TeamTileProgress) => {
    const text = tile.type === "drop"
      ? `${progress.current_drops}/${tile.required_drops ?? 0} drops`
      : `${formatValue(progress.current_xp)} / ${formatValue(tile.required_xp ?? 0)} xp`;

    return (
      <div
        key={`${label}-${progress.team_id}`}
        className={`rounded border px-2 py-1 text-[11px] ${
          progress.is_complete
            ? "border-osrs-green-border bg-osrs-green/80 text-green-100"
            : "border-osrs-red-border bg-osrs-panel-dark text-osrs-text"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{label}</span>
          <span>{progress.is_complete ? "✓" : "✗"}</span>
        </div>
        <div>{text}</div>
        {progress.pet_completed ? (
          <div className="mt-1 inline-block rounded bg-yellow-700 px-1.5 py-0.5 text-[10px] text-yellow-100">
            🐾 Pet!
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={`osrs-panel flex h-full flex-col gap-2 border ${bgClass} p-2`}>
      <div className="relative h-20 overflow-hidden rounded border border-osrs-border bg-osrs-panel-dark">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title ?? "Tile image"}
            fill
            sizes="(max-width: 768px) 20vw, 10vw"
            className="object-contain p-1"
            unoptimized
            onError={() => setImageSrc("")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">🎯</div>
        )}
      </div>

      <div>
        <h3 className="truncate text-sm">{title ?? "Unconfigured tile"}</h3>
        <p className="text-xs text-osrs-text-muted">{goal}</p>
      </div>

      <div className="grid gap-1">
        {renderTeamRow(teamNames[0], team1Progress)}
        {renderTeamRow(teamNames[1], team2Progress)}
      </div>
    </div>
  );
}
