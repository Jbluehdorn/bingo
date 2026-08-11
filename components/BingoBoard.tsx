"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { getTileImageUrl, resolveStoredImageUrl } from "@/lib/images";
import { getTileDisplayName, parseTileAcceptedDrops } from "@/lib/types";
import type { TeamWithPlayers, TileWithProgress } from "@/lib/types";

interface BingoBoardProps {
  tiles: TileWithProgress[];
  team: TeamWithPlayers;
  teamIndex: 0 | 1;
  petTileRules: string | null;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

interface ModalProps {
  entry: TileWithProgress;
  progress: TileWithProgress["team1"];
  progressText: string;
  teamId: number;
  onClose: () => void;
}

function TileModal({ entry, progress, progressText, teamId, onClose }: ModalProps) {
  const { tile } = entry;
  const initialSrc = useMemo(() => resolveStoredImageUrl(getTileImageUrl(tile)), [tile]);
  const [imageSrc, setImageSrc] = useState(initialSrc);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const acceptedDrops = useMemo(() => parseTileAcceptedDrops(tile), [tile]);
  const displayName = getTileDisplayName(tile);
  const images = progress.drop_images;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCarouselIndex((i) => (i > 0 ? i - 1 : images.length - 1));
      if (e.key === "ArrowRight") setCarouselIndex((i) => (i < images.length - 1 ? i + 1 : 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, images.length]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded border border-osrs-border bg-osrs-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center gap-4 p-4 ${progress.is_complete ? "bg-osrs-green/30" : "bg-osrs-panel-dark"}`}>
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-osrs-border bg-osrs-panel-dark">
            {imageSrc ? (
              <Image src={imageSrc} alt={displayName} fill sizes="80px" className="object-contain p-1" unoptimized onError={() => setImageSrc("")} />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl">🎯</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-osrs-text-muted">#{tile.position}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tile.type === "drop" ? "bg-osrs-border text-osrs-text" : "bg-blue-900 text-blue-200"}`}>
                {tile.type}
              </span>
              {progress.is_complete && (
                <span className="rounded bg-osrs-green/60 px-1.5 py-0.5 text-[10px] font-semibold text-green-200">✓ Complete</span>
              )}
              {progress.pet_completed && (
                <span className="rounded bg-yellow-700 px-1.5 py-0.5 text-[10px] text-yellow-100">🐾 Pet!</span>
              )}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-osrs-text-bright">{displayName}</h3>
            <p className="text-sm text-osrs-text">{progressText}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 cursor-pointer self-start text-osrs-text-muted hover:text-osrs-text-bright text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-4">
          {/* Custom rules */}
          {tile.custom_rules && (
            <div>
              <div className="mb-1 text-sm font-semibold text-osrs-text-bright">📋 Custom Rules</div>
              <p className="whitespace-pre-wrap text-sm text-osrs-text">{tile.custom_rules}</p>
            </div>
          )}

          {/* Drop screenshot carousel */}
          {images.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-osrs-text-bright">
                Drop Screenshots <span className="font-normal text-osrs-text-muted">({images.length})</span>
              </div>
              <div className="relative overflow-hidden rounded border border-osrs-border bg-osrs-panel-dark">
                <div className="relative aspect-video w-full">
                  <Image
                    src={resolveStoredImageUrl(images[carouselIndex]!.url)}
                    alt={`Drop by ${images[carouselIndex]!.player}`}
                    fill
                    sizes="448px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-between border-t border-osrs-border px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setCarouselIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                    className="cursor-pointer rounded px-2 py-0.5 text-sm text-osrs-text-muted hover:text-osrs-text-bright disabled:opacity-30"
                    disabled={images.length <= 1}
                  >
                    ‹ Prev
                  </button>
                  <div className="text-center">
                    <span className="text-xs text-osrs-text-bright">{images[carouselIndex]!.player}</span>
                    <span className="ml-2 text-xs text-osrs-text-muted">{carouselIndex + 1} / {images.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCarouselIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                    className="cursor-pointer rounded px-2 py-0.5 text-sm text-osrs-text-muted hover:text-osrs-text-bright disabled:opacity-30"
                    disabled={images.length <= 1}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contributors */}
          {progress.contributors.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-osrs-text-bright">
                Drops Logged <span className="font-normal text-osrs-text-muted">({progress.contributors.length})</span>
              </div>
              <ol className="flex flex-col gap-1">
                {progress.contributors.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-center text-xs text-osrs-text-muted">{i + 1}.</span>
                    <span className="text-osrs-text">{name}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tile.type === "xp" && (
            <div>
              <div className="mb-2 text-sm font-semibold text-osrs-text-bright">
                Individual XP Gains
              </div>
              {progress.xp_gains.length > 0 ? (
                <ol className="flex flex-col gap-1">
                  {progress.xp_gains.map((gain, index) => (
                    <li
                      key={gain.player}
                      className="flex items-center justify-between gap-4 rounded border border-osrs-border bg-osrs-panel-dark px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-osrs-text">
                        <span className="mr-2 text-xs text-osrs-text-muted">{index + 1}.</span>
                        {gain.player}
                      </span>
                      <span className="shrink-0 font-semibold text-osrs-text-bright">
                        {formatNumber(gain.xp)} xp
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-osrs-text-muted">No player XP gains are available yet.</p>
              )}
            </div>
          )}

          {/* Accepted drops */}
          {tile.type === "drop" && acceptedDrops.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-osrs-text-bright">
                Accepted Drops <span className="font-normal text-osrs-text-muted">({acceptedDrops.length})</span>
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {acceptedDrops.map((drop) => (
                  <li key={drop} className="text-xs text-osrs-text">• {drop}</li>
                ))}
              </ul>
            </div>
          )}

          {tile.type === "drop" && acceptedDrops.length === 0 && progress.contributors.length === 0 && (
            <p className="text-sm text-osrs-text-muted">No drops logged yet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-osrs-border p-4">
          {tile.type === "drop" ? (
            <Link
              href={`/log-drop?team=${teamId}`}
              className="osrs-button text-sm"
              onClick={onClose}
            >
              Log a Drop
            </Link>
          ) : <span />}
          <button type="button" onClick={onClose} className="text-sm text-osrs-text-muted hover:text-osrs-text">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardMiniTile({
  tile,
  isComplete,
  progressText,
  petCompleted,
  contributors,
  onClick,
}: {
  tile: TileWithProgress["tile"];
  isComplete: boolean;
  progressText: string;
  petCompleted: boolean;
  contributors: string[];
  onClick: () => void;
}) {
  const initialSrc = useMemo(() => resolveStoredImageUrl(getTileImageUrl(tile)), [tile]);
  const [imageSrc, setImageSrc] = useState(initialSrc);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-34 w-full cursor-pointer flex-col gap-2 rounded border p-2 text-left transition-opacity hover:opacity-80 ${
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
        {contributors.length > 0 && (
          <div className="truncate text-[10px] text-osrs-text-muted">
            {contributors.join(", ")}
          </div>
        )}
        {petCompleted ? (
          <span className="mt-1 inline-block rounded bg-yellow-700 px-1.5 py-0.5 text-[10px] text-yellow-100">
            🐾 Pet!
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function BingoBoard({ tiles, team, teamIndex, petTileRules }: BingoBoardProps) {
  const teamTiles = tiles.map((tile) => (teamIndex === 0 ? tile.team1 : tile.team2));
  const completeCount = teamTiles.filter((tile) => tile.is_complete).length;
  const storageKey = `board-collapsed-${team.id}`;

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "true";
  });
  const [selectedEntry, setSelectedEntry] = useState<TileWithProgress | null>(null);

  const petProofLogged = !!team.pet_image_url;
  const petAwardEntry = tiles.find((entry) => {
    const progress = teamIndex === 0 ? entry.team1 : entry.team2;
    return progress.pet_completed;
  });

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

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
            {team.players.length > 0 && (
              <p className="mt-0.5 text-xs text-osrs-text-muted">
                {team.players.map((p) => p.username).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/log-drop?team=${team.id}`} className="osrs-button text-sm">
              Log a Drop
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="rounded border border-osrs-border bg-osrs-panel px-2 py-1 text-sm text-osrs-text transition-colors hover:bg-osrs-panel-dark"
              title={collapsed ? "Expand board" : "Collapse board"}
            >
              {collapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>
      </div>

      {!collapsed && (
        <>
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
                  contributors={progress.contributors}
                  onClick={() => setSelectedEntry(entry)}
                />
              );
            })}
          </div>

          {/* Bonus Pet Tile */}
          <div className="mt-2">
            <div className={`flex items-center justify-between gap-4 rounded border p-3 transition-colors ${petAwardEntry ? "border-osrs-green-border bg-osrs-green/20" : petProofLogged ? "border-yellow-700 bg-yellow-950/30" : "border-osrs-border bg-osrs-panel-dark"}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🐾</span>
                <div>
                  <div className="text-sm font-semibold text-osrs-text-bright">🏆 Bonus Pet Tile</div>
                  {petAwardEntry ? (
                    <>
                      <p className="text-sm text-osrs-gold">
                        Free tile awarded: #{petAwardEntry.tile.position} {getTileDisplayName(petAwardEntry.tile)}
                      </p>
                      {team.pet_obtained_by ? (
                        <p className="text-xs text-osrs-text-muted">
                          Pet proof logged by {team.pet_obtained_by}
                          {team.pet_name ? ` (${team.pet_name})` : ""}
                        </p>
                      ) : null}
                    </>
                  ) : petProofLogged ? (
                    <>
                      <p className="text-sm text-yellow-200">
                        Proof logged by {team.pet_obtained_by ?? "the team"}
                        {team.pet_name ? ` (${team.pet_name})` : ""}
                      </p>
                      <p className="text-xs text-osrs-text-muted">Awaiting admin tile award</p>
                      <a
                        href={resolveStoredImageUrl(team.pet_image_url!)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-osrs-text underline"
                      >
                        View proof
                      </a>
                    </>
                  ) : (
                    <p className="text-sm text-osrs-text-muted italic">No pet proof logged</p>
                  )}
                  {petTileRules ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-osrs-text-muted">
                      {petTileRules}
                    </p>
                  ) : null}
                </div>
              </div>
              <Link href={`/log-pet?team=${team.id}`} className="osrs-button shrink-0 text-sm">
                {petProofLogged ? "Update Proof" : "Log Pet Proof"}
              </Link>
            </div>
          </div>
        </>
      )}

      {selectedEntry && (
        <TileModal
          entry={selectedEntry}
          progress={teamIndex === 0 ? selectedEntry.team1 : selectedEntry.team2}
          progressText={
            selectedEntry.tile.type === "drop"
              ? `${(teamIndex === 0 ? selectedEntry.team1 : selectedEntry.team2).current_drops}/${selectedEntry.tile.required_drops ?? 0} drops`
              : `${formatNumber((teamIndex === 0 ? selectedEntry.team1 : selectedEntry.team2).current_xp)} / ${formatNumber(selectedEntry.tile.required_xp ?? 0)} xp gained`
          }
          teamId={team.id}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </section>
  );
}
