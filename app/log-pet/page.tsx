"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { Game, TeamWithPlayers } from "@/lib/types";

interface LogPetPageProps {
  searchParams: Promise<{ team?: string | string[] | undefined }>;
}

export default function LogPetPage({ searchParams }: LogPetPageProps) {
  const params = use(searchParams);
  const requestedTeamId = Number(Array.isArray(params.team) ? params.team[0] : params.team ?? "1");

  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(requestedTeamId);
  const [playerId, setPlayerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successPlayer, setSuccessPlayer] = useState("");
  const [successTeam, setSuccessTeam] = useState("");
  const [petTileRules, setPetTileRules] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [teamsResponse, gameResponse] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/game"),
        ]);
        const payload = (await teamsResponse.json()) as { teams?: TeamWithPlayers[]; error?: string };
        const gamePayload = (await gameResponse.json()) as { game?: Game; error?: string };
        if (!teamsResponse.ok) throw new Error(payload.error ?? "Failed to load teams.");
        if (!gameResponse.ok) throw new Error(gamePayload.error ?? "Failed to load pet tile rules.");

        const loadedTeams = payload.teams ?? [];
        setTeams(loadedTeams);
        setPetTileRules(gamePayload.game?.pet_tile_rules ?? "");

        const validTeamId = loadedTeams.some((t) => t.id === requestedTeamId)
          ? requestedTeamId
          : loadedTeams[0]?.id ?? 1;
        setSelectedTeamId(validTeamId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load teams.");
      }
    }
    void load();
  }, [requestedTeamId]);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  const effectivePlayerId =
    playerId && selectedTeam?.players.some((p) => String(p.id) === playerId)
      ? playerId
      : selectedTeam?.players[0]?.id
        ? String(selectedTeam.players[0].id)
        : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectivePlayerId || !file) {
      setError("Please select a player and attach a screenshot.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("type", "drop");
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadPayload = (await uploadRes.json()) as { key?: string; error?: string };
      if (!uploadRes.ok || !uploadPayload.key) throw new Error(uploadPayload.error ?? "Failed to upload screenshot.");

      const player = selectedTeam?.players.find((p) => String(p.id) === effectivePlayerId);
      const playerUsername = player?.username ?? "";

      const saveRes = await fetch(`/api/teams/${selectedTeamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet_image_url: uploadPayload.key, pet_obtained_by: playerUsername }),
      });
      const savePayload = (await saveRes.json()) as { error?: string };
      if (!saveRes.ok) throw new Error(savePayload.error ?? "Failed to save pet drop.");

      setSuccessPlayer(playerUsername);
      setSuccessTeam(selectedTeam?.name ?? "");
      setFile(null);
      const input = document.getElementById("pet-image") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit pet drop.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successPlayer) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div className="osrs-panel border border-osrs-green-border bg-osrs-green/80 p-6 text-center">
          <h1 className="mb-2 text-3xl">Pet Proof Logged! 🐾</h1>
          <p className="text-sm text-osrs-text-muted mb-1">🏆 Bonus Pet Tile — {successTeam}</p>
          <p className="font-semibold">Submitted by {successPlayer}.</p>
          <p className="mt-2 text-sm text-osrs-text-muted">
            An admin can now choose which incomplete tile receives the free completion.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="osrs-button flex-1 text-center">
            ← Back to Game Board
          </Link>
          <button
            type="button"
            className="osrs-button flex-1"
            onClick={() => { setSuccessPlayer(""); setSuccessTeam(""); setError(""); }}
          >
            Log another pet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="text-center">
        <h1 className="text-4xl">Log Pet Proof</h1>
        <p className="text-osrs-text-muted">Upload the screenshot so an admin can award a free tile.</p>
      </div>

      <div className="osrs-panel rounded border border-osrs-border px-4 py-3 text-sm text-osrs-text-muted">
        🏆 <span className="font-semibold text-osrs-text-bright">Bonus Pet Tile</span> — proof is logged here; the admin selects the tile it completes.
        {petTileRules ? <p className="mt-2 whitespace-pre-wrap text-osrs-text">{petTileRules}</p> : null}
      </div>

      <form className="osrs-panel flex flex-col gap-4 p-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Team</span>
          <select
            className="osrs-input"
            value={selectedTeamId}
            onChange={(e) => { setSelectedTeamId(Number(e.target.value)); setPlayerId(""); }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Player</span>
          <select
            className="osrs-input"
            value={effectivePlayerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            {selectedTeam?.players.length ? (
              selectedTeam.players.map((p) => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))
            ) : (
              <option value="">No players available</option>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Screenshot</span>
          <input
            id="pet-image"
            className="osrs-input"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error ? <div className="rounded border border-osrs-red-border bg-osrs-red/80 p-3">{error}</div> : null}

        <button
          type="submit"
          className="osrs-button"
          disabled={submitting || !selectedTeam?.players.length}
        >
          {submitting ? "Submitting..." : "Submit Pet Proof"}
        </button>
      </form>
    </div>
  );
}
