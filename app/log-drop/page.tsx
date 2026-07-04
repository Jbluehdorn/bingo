"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { TeamWithPlayers, TileWithProgress } from "@/lib/types";

interface LogDropPageProps {
  searchParams: Promise<{ team?: string | string[] | undefined }>;
}

export default function LogDropPage({ searchParams }: LogDropPageProps) {
  const params = use(searchParams);
  const requestedTeamId = Number(Array.isArray(params.team) ? params.team[0] : params.team ?? "1");

  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [tiles, setTiles] = useState<TileWithProgress[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(requestedTeamId);
  const [playerId, setPlayerId] = useState("");
  const [tileId, setTileId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [teamsResponse, tilesResponse] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/tiles"),
        ]);

        const teamsPayload = (await teamsResponse.json()) as { teams?: TeamWithPlayers[]; error?: string };
        const tilesPayload = (await tilesResponse.json()) as { tiles?: TileWithProgress[]; error?: string };

        if (!teamsResponse.ok) throw new Error(teamsPayload.error ?? "Failed to load teams.");
        if (!tilesResponse.ok) throw new Error(tilesPayload.error ?? "Failed to load tiles.");

        const loadedTeams = teamsPayload.teams ?? [];
        setTeams(loadedTeams);
        setTiles(tilesPayload.tiles ?? []);

        const validTeamId = loadedTeams.some((team) => team.id === requestedTeamId)
          ? requestedTeamId
          : loadedTeams[0]?.id ?? 1;
        setSelectedTeamId(validTeamId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load form data.");
      }
    }

    void load();
  }, [requestedTeamId]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  const availableTiles = useMemo(
    () =>
      tiles.filter((entry) => {
        if (entry.tile.type !== "drop") return false;
        const progress = entry.team1.team_id === selectedTeamId ? entry.team1 : entry.team2;
        return !progress.is_complete;
      }),
    [selectedTeamId, tiles],
  );
  const effectivePlayerId =
    playerId && selectedTeam?.players.some((player) => String(player.id) === playerId)
      ? playerId
      : selectedTeam?.players[0]?.id
        ? String(selectedTeam.players[0].id)
        : "";
  const effectiveTileId =
    tileId && availableTiles.some((entry) => String(entry.tile.id) === tileId)
      ? tileId
      : availableTiles[0]?.tile.id
        ? String(availableTiles[0].tile.id)
        : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectivePlayerId || !effectiveTileId || !file) {
      setError("Please choose a player, tile, and screenshot.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("teamId", String(selectedTeamId));
      formData.append("playerId", effectivePlayerId);
      formData.append("tileId", effectiveTileId);
      formData.append("image", file);

      const response = await fetch("/api/drops", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to submit drop.");

      setSuccessMessage(payload.message ?? "Drop logged successfully!");
      setFile(null);
      const input = document.getElementById("drop-image") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit drop.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div className="osrs-panel border border-osrs-green-border bg-osrs-green/80 p-6 text-center">
          <h1 className="mb-2 text-3xl">Drop Logged!</h1>
          <p>{successMessage}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="osrs-button flex-1 text-center">
            ← Back to Game Board
          </Link>
          <button
            type="button"
            className="osrs-button flex-1"
            onClick={() => {
              setSuccessMessage("");
              setError("");
            }}
          >
            Log another drop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="text-center">
        <h1 className="text-4xl">Log a Drop</h1>
        <p className="text-osrs-text-muted">Upload your screenshot instantly to claim progress.</p>
      </div>

      <form className="osrs-panel flex flex-col gap-4 p-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Team</span>
          <select
            className="osrs-input"
            value={selectedTeamId}
            onChange={(event) => {
              setSelectedTeamId(Number(event.target.value));
              setPlayerId("");
              setTileId("");
            }}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Player</span>
          <select
            className="osrs-input"
            value={effectivePlayerId}
            onChange={(event) => setPlayerId(event.target.value)}
          >
            {selectedTeam?.players.length ? (
              selectedTeam.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.username}
                </option>
              ))
            ) : (
              <option value="">No players available</option>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Tile</span>
          <select
            className="osrs-input"
            value={effectiveTileId}
            onChange={(event) => setTileId(event.target.value)}
          >
            {availableTiles.length ? (
              availableTiles.map((entry) => (
                <option key={entry.tile.id} value={entry.tile.id}>
                  #{entry.tile.position} - {entry.tile.boss_name} ({entry.team1.team_id === selectedTeamId
                    ? `${entry.team1.current_drops}/${entry.tile.required_drops ?? 0}`
                    : `${entry.team2.current_drops}/${entry.tile.required_drops ?? 0}`})
                </option>
              ))
            ) : (
              <option value="">No incomplete drop tiles available</option>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Screenshot</span>
          <input
            id="drop-image"
            className="osrs-input"
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {error ? <div className="rounded border border-osrs-red-border bg-osrs-red/80 p-3">{error}</div> : null}

        <button
          type="submit"
          className="osrs-button"
          disabled={submitting || !selectedTeam?.players.length || !availableTiles.length}
        >
          {submitting ? "Submitting..." : "Submit Drop"}
        </button>
      </form>
    </div>
  );
}
