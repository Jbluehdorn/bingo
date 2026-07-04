"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import BossSearch from "@/components/BossSearch";
import { resolveStoredImageUrl } from "@/lib/images";
import type {
  BossEntry,
  DropSubmissionWithDetails,
  Game,
  TeamWithPlayers,
  Tile,
  TileType,
  TileWithProgress,
} from "@/lib/types";
import { OSRS_SKILLS, parseTileAcceptedDrops } from "@/lib/types";

interface GamePayload {
  game: Game;
  teams: TeamWithPlayers[];
  tiles: Tile[];
  playerCounts: Record<number, number>;
  tileCount: number;
  winnerName: string | null;
}

interface TileEditorState {
  id: number;
  position: number;
  type: TileType;
  display_title: string;
  boss_name: string;
  required_drops: number;
  accepted_drops: string[];
  skill_name: string;
  required_xp: number;
  image_url: string;
}

const emptyTileForm = {
  id: 0,
  position: 1,
  type: "drop" as TileType,
  display_title: "",
  boss_name: "",
  required_drops: 1,
  accepted_drops: [],
  skill_name: "attack",
  required_xp: 100000,
  image_url: "",
} satisfies TileEditorState;

export default function AdminPage() {
  const [gameData, setGameData] = useState<GamePayload | null>(null);
  const [progressTiles, setProgressTiles] = useState<TileWithProgress[]>([]);
  const [dropRows, setDropRows] = useState<DropSubmissionWithDetails[]>([]);
  const [tileEditor, setTileEditor] = useState<TileEditorState>(emptyTileForm);
  const [newDropInput, setNewDropInput] = useState("");
  const [teamNames, setTeamNames] = useState<Record<number, string>>({});
  const [newPlayers, setNewPlayers] = useState<Record<number, string>>({});
  const [petTeamId, setPetTeamId] = useState(1);
  const [petTileId, setPetTileId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"Game" | "Teams" | "Tiles" | "Drops" | "Pets">("Game");
  const [scheduledInput, setScheduledInput] = useState(""); // datetime-local value (local tz)

  async function fetchAdminData() {
    const [gameResponse, tilesResponse, dropsResponse] = await Promise.all([
      fetch("/api/game"),
      fetch("/api/tiles"),
      fetch("/api/drops"),
    ]);

    const gamePayload = (await gameResponse.json()) as GamePayload & { error?: string };
    const tilesPayload = (await tilesResponse.json()) as { tiles?: TileWithProgress[]; error?: string };
    const dropsPayload = (await dropsResponse.json()) as { submissions?: DropSubmissionWithDetails[]; error?: string };

    if (!gameResponse.ok) throw new Error(gamePayload.error ?? "Failed to load game.");
    if (!tilesResponse.ok) throw new Error(tilesPayload.error ?? "Failed to load tiles.");
    if (!dropsResponse.ok) throw new Error(dropsPayload.error ?? "Failed to load drops.");

    return {
      gamePayload,
      tiles: tilesPayload.tiles ?? [],
      drops: dropsPayload.submissions ?? [],
    };
  }

  async function loadAll() {
    const data = await fetchAdminData();
    setGameData(data.gamePayload);
    setProgressTiles(data.tiles);
    setDropRows(data.drops);
    setTeamNames(Object.fromEntries((data.gamePayload.teams ?? []).map((team) => [team.id, team.name])));
    setPetTeamId(data.gamePayload.teams[0]?.id ?? 1);
    // Pre-fill the schedule input if a schedule already exists
    if (data.gamePayload.game.scheduled_start_at) {
      const d = new Date(data.gamePayload.game.scheduled_start_at);
      // datetime-local format: YYYY-MM-DDTHH:MM
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduledInput(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const data = await fetchAdminData();
        if (cancelled) return;

        setGameData(data.gamePayload);
        setProgressTiles(data.tiles);
        setDropRows(data.drops);
        setTeamNames(Object.fromEntries((data.gamePayload.teams ?? []).map((team) => [team.id, team.name])));
        setPetTeamId(data.gamePayload.teams[0]?.id ?? 1);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load admin data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const tileMap = useMemo(() => new Map(progressTiles.map((entry) => [entry.tile.position, entry.tile])), [progressTiles]);

  const incompletePetTiles = useMemo(
    () =>
      progressTiles.filter((entry) => {
        const progress = entry.team1.team_id === petTeamId ? entry.team1 : entry.team2;
        return !progress.is_complete;
      }),
    [petTeamId, progressTiles],
  );
  const effectivePetTileId =
    petTileId && incompletePetTiles.some((entry) => String(entry.tile.id) === petTileId)
      ? petTileId
      : incompletePetTiles[0]?.tile.id
        ? String(incompletePetTiles[0].tile.id)
        : "";

  function editTile(position: number) {
    const existing = tileMap.get(position);
    if (existing) {
      setTileEditor({
        id: existing.id,
        position: existing.position,
        type: existing.type,
        display_title: existing.display_title ?? "",
        boss_name: existing.boss_name ?? "",
        required_drops: existing.required_drops ?? 1,
        accepted_drops: parseTileAcceptedDrops(existing),
        skill_name: existing.skill_name ?? "attack",
        required_xp: existing.required_xp ?? 100000,
        image_url: existing.image_url ?? "",
      });
      return;
    }
    setTileEditor({ ...emptyTileForm, position, id: 0 });
  }

  function addAcceptedDrop() {
    const drop = newDropInput.trim();
    if (!drop || tileEditor.accepted_drops.includes(drop)) return;
    setTileEditor((current) => ({ ...current, accepted_drops: [...current.accepted_drops, drop] }));
    setNewDropInput("");
  }

  function removeAcceptedDrop(drop: string) {
    setTileEditor((current) => ({
      ...current,
      accepted_drops: current.accepted_drops.filter((d) => d !== drop),
    }));
  }

  async function runAction(action: () => Promise<void>) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await action();
      await loadAll();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTeamSave(teamId: number) {
    await runAction(async () => {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamNames[teamId] ?? "" }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save team.");
      setMessage(payload.message ?? "Team updated.");
    });
  }

  async function handleTeamPhotoUpload(teamId: number, file: File | null) {
    if (!file) return;

    await runAction(async () => {
      const formData = new FormData();
      formData.append("type", "team-photo");
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadPayload = (await uploadResponse.json()) as { key?: string; error?: string };
      if (!uploadResponse.ok || !uploadPayload.key) {
        throw new Error(uploadPayload.error ?? "Failed to upload team photo.");
      }

      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_url: uploadPayload.key }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save team photo.");
      setMessage(payload.message ?? "Team photo updated.");
    });
  }

  async function handleAddPlayer(teamId: number) {
    const username = (newPlayers[teamId] ?? "").trim();
    if (!username) {
      setError("Enter a player username first.");
      return;
    }

    await runAction(async () => {
      const validationResponse = await fetch(`/api/players/validate?username=${encodeURIComponent(username)}`);
      const validationPayload = (await validationResponse.json()) as { valid?: boolean; error?: string };
      if (!validationResponse.ok || !validationPayload.valid) {
        throw new Error(validationPayload.error ?? "That player could not be found on Wise Old Man.");
      }

      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, username }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to add player.");
      setNewPlayers((current) => ({ ...current, [teamId]: "" }));
      setMessage(payload.message ?? "Player added.");
    });
  }

  async function handleDeletePlayer(playerId: number) {
    await runAction(async () => {
      const response = await fetch(`/api/players/${playerId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete player.");
      setMessage(payload.message ?? "Player removed.");
    });
  }

  async function handleSaveTile() {
    await runAction(async () => {
      const body = {
        position: tileEditor.position,
        type: tileEditor.type,
        display_title: tileEditor.display_title.trim() || null,
        boss_name: tileEditor.type === "drop" ? tileEditor.boss_name.trim() : null,
        required_drops: tileEditor.type === "drop" ? Number(tileEditor.required_drops) : null,
        accepted_drops: tileEditor.type === "drop" ? JSON.stringify(tileEditor.accepted_drops) : null,
        skill_name: tileEditor.type === "xp" ? tileEditor.skill_name : null,
        required_xp: tileEditor.type === "xp" ? Number(tileEditor.required_xp) : null,
        image_url: tileEditor.image_url.trim() || null,
      };

      const isExisting = tileEditor.id > 0;
      const response = await fetch(isExisting ? `/api/tiles/${tileEditor.id}` : "/api/tiles", {
        method: isExisting ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save tile.");
      setMessage(payload.message ?? "Tile saved.");
    });
  }

  async function handleDeleteTile() {
    if (!tileEditor.id) return;

    await runAction(async () => {
      const response = await fetch(`/api/tiles/${tileEditor.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete tile.");
      setTileEditor({ ...emptyTileForm, position: tileEditor.position });
      setMessage(payload.message ?? "Tile deleted.");
    });
  }

  async function handleDeleteDrop(dropId: number) {
    await runAction(async () => {
      const response = await fetch(`/api/drops/${dropId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete drop.");
      setMessage(payload.message ?? "Drop deleted.");
    });
  }

  async function handleStartCompetition() {
    await runAction(async () => {
      const response = await fetch("/api/game/start", { method: "POST" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to start competition.");
      setMessage(payload.message ?? "Competition started.");
    });
  }

  async function handleScheduleStart() {
    if (!scheduledInput) {
      setError("Please select a date and time.");
      return;
    }
    // Convert the local datetime-input value to a UTC ISO string.
    const utc = new Date(scheduledInput).toISOString();
    await runAction(async () => {
      const response = await fetch("/api/game/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_start_at: utc }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to schedule start.");
      setMessage(payload.message ?? "Start time scheduled.");
    });
  }

  async function handleClearSchedule() {
    await runAction(async () => {
      const response = await fetch("/api/game/schedule", { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to clear schedule.");
      setScheduledInput("");
      setMessage(payload.message ?? "Schedule cleared.");
    });
  }

  async function handleResetGame() {
    if (!window.confirm("Reset the entire bingo game? This clears players, tiles, drops, and snapshots.")) {
      return;
    }

    await runAction(async () => {
      const response = await fetch("/api/game/reset", { method: "POST" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to reset game.");
      setMessage(payload.message ?? "Game reset.");
    });
  }

  async function handleAwardPetTile() {
    if (!effectivePetTileId) {
      setError("Select an incomplete tile to award.");
      return;
    }

    await runAction(async () => {
      const response = await fetch("/api/pet-tile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: petTeamId, tile_id: Number(effectivePetTileId) }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to award pet tile.");
      setMessage(payload.message ?? "Pet tile awarded.");
    });
  }

  if (loading && !gameData) {
    return <div className="osrs-panel p-6 text-center">Loading admin panel...</div>;
  }

  const tabs = ["Game", "Teams", "Tiles", "Drops", "Pets"] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-4xl">Admin Panel</h1>
        <p className="text-osrs-text-muted">Configure teams, tiles, drops, and the game lifecycle.</p>
      </div>

      {error ? <div className="rounded border border-osrs-red-border bg-osrs-red/80 p-3">{error}</div> : null}
      {message ? <div className="rounded border border-osrs-green-border bg-osrs-green/80 p-3">{message}</div> : null}

      {/* Tab bar */}
      <div className="flex gap-1 rounded border border-osrs-border bg-osrs-panel-dark p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-osrs-button text-osrs-text-bright"
                : "text-osrs-text-muted hover:bg-osrs-panel hover:text-osrs-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Game tab */}
      {activeTab === "Game" && (
        <div className="osrs-panel flex flex-col gap-4 p-6">
          <h2 className="text-xl font-semibold text-osrs-text-bright">Game Management</h2>

          <div className="inline-flex w-fit rounded border border-osrs-border bg-osrs-panel-dark px-3 py-2 font-semibold capitalize">
            Status: {gameData?.game.status}
          </div>

          {gameData?.game.started_at ? (
            <div className="text-sm text-osrs-text-muted">
              Competition started at:{" "}
              <span className="text-osrs-text">
                {new Date(gameData.game.started_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          ) : null}

          {gameData?.game.status === "completed" ? (
            <div className="text-sm text-osrs-text-muted">Winner: {gameData.winnerName ?? "Unknown"}</div>
          ) : null}

          {/* Schedule start — only when game is in setup */}
          {gameData?.game.status === "setup" && (
            <div className="flex flex-col gap-3 rounded border border-osrs-border bg-osrs-panel-dark p-4">
              <h3 className="font-semibold text-osrs-text-bright">Schedule Start Time</h3>

              {gameData.game.scheduled_start_at ? (
                <div className="text-sm text-osrs-text-muted">
                  Currently scheduled:{" "}
                  <span className="font-semibold text-osrs-text">
                    {new Date(gameData.game.scheduled_start_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>{" "}
                  (your local time)
                </div>
              ) : null}

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-osrs-text-muted">Date &amp; time (your local timezone)</label>
                  <input
                    type="datetime-local"
                    className="osrs-input"
                    value={scheduledInput}
                    onChange={(e) => setScheduledInput(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="osrs-button"
                  onClick={() => void handleScheduleStart()}
                  disabled={saving || !scheduledInput}
                >
                  {gameData.game.scheduled_start_at ? "Update Schedule" : "Schedule Start"}
                </button>
                {gameData.game.scheduled_start_at ? (
                  <button
                    type="button"
                    className="osrs-button border-osrs-border !bg-osrs-panel-dark"
                    onClick={() => void handleClearSchedule()}
                    disabled={saving}
                  >
                    Clear Schedule
                  </button>
                ) : null}
              </div>

              <p className="text-xs text-osrs-text-muted">
                The competition will automatically start when the scheduled time is reached. Viewers will see a countdown.
              </p>

              <hr className="border-osrs-border" />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="osrs-button"
                  onClick={() => void handleStartCompetition()}
                  disabled={saving || (gameData?.tileCount ?? 0) !== 25}
                >
                  Start Now
                </button>
              </div>
              <p className="text-xs text-osrs-text-muted">
                You need 25 configured tiles and at least one player per team before starting.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" className="osrs-button border-red-800 !bg-red-900" onClick={() => void handleResetGame()} disabled={saving}>
              Reset Game
            </button>
          </div>
        </div>
      )}

      {/* Teams tab */}
      {activeTab === "Teams" && (
        <div className="osrs-panel p-6">
          <h2 className="mb-4 text-xl font-semibold text-osrs-text-bright">Team Management</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {gameData?.teams.map((team) => (
              <div key={team.id} className="rounded border border-osrs-border bg-osrs-panel-dark p-4">
                <div className="mb-4 flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded border border-osrs-border bg-osrs-panel">
                    {team.photo_url ? <Image src={resolveStoredImageUrl(team.photo_url)} alt={team.name} fill sizes="64px" className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center text-2xl">🛡️</div>}
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-semibold">Team Name</label>
                    <div className="flex gap-2">
                      <input className="osrs-input" value={teamNames[team.id] ?? team.name} onChange={(event) => setTeamNames((current) => ({ ...current, [team.id]: event.target.value }))} />
                      <button type="button" className="osrs-button" onClick={() => void handleTeamSave(team.id)}>Save</button>
                    </div>
                  </div>
                </div>

                <label className="mb-4 flex flex-col gap-2">
                  <span className="text-sm font-semibold">Team Photo</span>
                  <input className="osrs-input" type="file" accept="image/*" onChange={(event) => void handleTeamPhotoUpload(team.id, event.target.files?.[0] ?? null)} />
                </label>

                <div className="mb-2 text-sm font-semibold">Players</div>
                <div className="mb-4 flex flex-col gap-2">
                  {team.players.length ? team.players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between rounded border border-osrs-border bg-osrs-panel px-3 py-2">
                      <span>{player.username}</span>
                      <button type="button" className="rounded border border-osrs-red-border px-2 py-1 text-xs" onClick={() => void handleDeletePlayer(player.id)}>Delete</button>
                    </div>
                  )) : <div className="text-sm text-osrs-text-muted">No players added yet.</div>}
                </div>

                <div className="flex gap-2">
                  <input className="osrs-input" placeholder="Wise Old Man username" value={newPlayers[team.id] ?? ""} onChange={(event) => setNewPlayers((current) => ({ ...current, [team.id]: event.target.value }))} />
                  <button type="button" className="osrs-button" onClick={() => void handleAddPlayer(team.id)}>Add player</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tiles tab */}
      {activeTab === "Tiles" && (
        <div className="osrs-panel p-6">
          <h2 className="mb-4 text-xl font-semibold text-osrs-text-bright">Tile Setup</h2>
          <div className="grid gap-2 sm:grid-cols-5">
            {Array.from({ length: 25 }, (_, index) => index + 1).map((position) => {
              const tile = tileMap.get(position);
              return (
                <button key={position} type="button" className={`rounded border p-3 text-left ${tile ? "border-osrs-border-light bg-osrs-panel" : "border-dashed border-osrs-border bg-osrs-panel-dark"}`} onClick={() => editTile(position)}>
                  <div className="text-xs text-osrs-text-muted">#{position}</div>
                  <div className="font-semibold text-osrs-text-bright">
                    {tile ? (tile.display_title ?? (tile.type === "drop" ? tile.boss_name : tile.skill_name)) : "Empty"}
                  </div>
                  <div className="text-xs text-osrs-text-muted">{tile ? (tile.type === "drop" ? `${tile.required_drops} drops` : `${tile.required_xp?.toLocaleString()} xp`) : "Click to configure"}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded border border-osrs-border bg-osrs-panel-dark p-4">
            <h3 className="mb-1 text-xl font-semibold">Tile Editor — Position #{tileEditor.position}</h3>
            <p className="mb-3 text-xs text-osrs-text-muted"><span className="text-red-400">*</span> Required field</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="font-semibold">Type <span className="text-red-400">*</span></span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" checked={tileEditor.type === "drop"} onChange={() => setTileEditor((current) => ({ ...current, type: "drop" }))} />Drop</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={tileEditor.type === "xp"} onChange={() => setTileEditor((current) => ({ ...current, type: "xp" }))} />XP</label>
                </div>
              </div>

              {tileEditor.type === "drop" ? (
                <>
                  {/* Display title — full width */}
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className="font-semibold">
                      Display Title <span className="text-red-400">*</span>
                      <span className="ml-1 text-xs font-normal text-osrs-text-muted">(shown on board; auto-filled when you select a boss)</span>
                    </span>
                    <input
                      className="osrs-input"
                      placeholder="e.g. Zulrah, Barrows Chest, Theatre of Blood…"
                      value={tileEditor.display_title}
                      onChange={(e) => setTileEditor((cur) => ({ ...cur, display_title: e.target.value }))}
                    />
                  </label>

                  {/* Boss search */}
                  <div className="flex flex-col gap-2">
                    <span className="font-semibold">Boss / Raid <span className="text-xs font-normal text-osrs-text-muted">(optional)</span></span>
                    <BossSearch
                      value={tileEditor.boss_name}
                      onSelect={(boss: BossEntry) => {
                        setTileEditor((current) => ({
                          ...current,
                          boss_name: boss.name,
                          display_title: current.display_title || boss.title,
                          image_url: boss.imageUrl || current.image_url,
                          accepted_drops: boss.drops,
                        }));
                      }}
                    />
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="font-semibold">Required Drops <span className="text-red-400">*</span></span>
                    <input className="osrs-input" type="number" min={1} value={tileEditor.required_drops} onChange={(event) => setTileEditor((current) => ({ ...current, required_drops: Number(event.target.value) }))} />
                  </label>

                  <div className="flex flex-col gap-3 md:col-span-2">
                    <span className="font-semibold">Accepted Drops <span className="text-xs font-normal text-osrs-text-muted">(optional — auto-populated from boss)</span></span>

                    <div className="min-h-[2.5rem] flex flex-wrap gap-2 rounded border border-osrs-border bg-osrs-panel-dark p-2">
                      {tileEditor.accepted_drops.length ? (
                        tileEditor.accepted_drops.map((drop) => (
                          <span
                            key={drop}
                            className="flex items-center gap-1 rounded border border-osrs-border bg-osrs-panel px-2 py-1 text-sm"
                          >
                            {drop}
                            <button
                              type="button"
                              aria-label={`Remove ${drop}`}
                              className="ml-1 text-osrs-text-muted hover:text-red-400"
                              onClick={() => removeAcceptedDrop(drop)}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-osrs-text-muted">
                          Select a boss to auto-populate, or add manually below.
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        className="osrs-input"
                        placeholder="Add a drop…"
                        value={newDropInput}
                        onChange={(e) => setNewDropInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); addAcceptedDrop(); }
                        }}
                      />
                      <button type="button" className="osrs-button shrink-0" onClick={addAcceptedDrop}>
                        Add
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="font-semibold">Skill <span className="text-red-400">*</span></span>
                    <select className="osrs-input" value={tileEditor.skill_name} onChange={(event) => setTileEditor((current) => ({ ...current, skill_name: event.target.value }))}>
                      {OSRS_SKILLS.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="font-semibold">Required XP <span className="text-red-400">*</span></span>
                    <input className="osrs-input" type="number" min={1} value={tileEditor.required_xp} onChange={(event) => setTileEditor((current) => ({ ...current, required_xp: Number(event.target.value) }))} />
                  </label>
                </>
              )}

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="font-semibold">Image URL / Stored Key <span className="text-xs font-normal text-osrs-text-muted">(optional — auto-filled from boss)</span></span>
                <input className="osrs-input" value={tileEditor.image_url} onChange={(event) => setTileEditor((current) => ({ ...current, image_url: event.target.value }))} />
              </label>
            </div>

            <div className="mt-4 flex gap-3">
              <button type="button" className="osrs-button" onClick={() => void handleSaveTile()}>Save Tile</button>
              {tileEditor.id ? <button type="button" className="osrs-button border-red-800 !bg-red-900" onClick={() => void handleDeleteTile()}>Delete Tile</button> : null}
            </div>
          </div>
        </div>
      )}

      {/* Drops tab */}
      {activeTab === "Drops" && (
        <div className="osrs-panel p-6">
          <h2 className="mb-4 text-xl font-semibold text-osrs-text-bright">Drop Management</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-osrs-border">
                  <th className="px-3 py-2 text-left">Screenshot</th>
                  <th className="px-3 py-2 text-left">Player</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-left">Tile</th>
                  <th className="px-3 py-2 text-left">Submitted</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {dropRows.map((drop) => (
                  <tr key={drop.id} className="border-b border-osrs-border/50">
                    <td className="px-3 py-2">
                      <a href={resolveStoredImageUrl(drop.image_url)} target="_blank" rel="noreferrer">
                        <Image
                          src={resolveStoredImageUrl(drop.image_url)}
                          alt={drop.tile_name}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded object-cover"
                          unoptimized
                        />
                      </a>
                    </td>
                    <td className="px-3 py-2">{drop.player_username}</td>
                    <td className="px-3 py-2">{drop.team_name}</td>
                    <td className="px-3 py-2">{drop.tile_name}</td>
                    <td className="px-3 py-2">{drop.submitted_at}</td>
                    <td className="px-3 py-2"><button type="button" className="osrs-button" onClick={() => void handleDeleteDrop(drop.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!dropRows.length ? <div className="py-4 text-osrs-text-muted">No drops logged yet.</div> : null}
          </div>
        </div>
      )}

      {/* Pets tab */}
      {activeTab === "Pets" && (
        <div className="osrs-panel p-6">
          <h2 className="mb-4 text-xl font-semibold text-osrs-text-bright">Pet Tile Award</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Team</span>
              <select
                className="osrs-input"
                value={petTeamId}
                onChange={(event) => {
                  setPetTeamId(Number(event.target.value));
                  setPetTileId("");
                }}
              >
                {gameData?.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Tile</span>
              <select
                className="osrs-input"
                value={effectivePetTileId}
                onChange={(event) => setPetTileId(event.target.value)}
              >
                {incompletePetTiles.length ? incompletePetTiles.map((entry) => <option key={entry.tile.id} value={entry.tile.id}>#{entry.tile.position} - {entry.tile.type === "drop" ? entry.tile.boss_name : entry.tile.skill_name}</option>) : <option value="">No incomplete tiles</option>}
              </select>
            </label>
          </div>
          <button type="button" className="osrs-button mt-4" onClick={() => void handleAwardPetTile()}>Award Pet Tile</button>
        </div>
      )}
    </div>
  );
}
