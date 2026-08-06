"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { resolveStoredImageUrl } from "@/lib/images";
import type { DropSubmissionWithDetails } from "@/lib/types";

function formatSubmittedAt(value: string): string {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ActivityLog({
  submissions,
}: {
  submissions: DropSubmissionWithDetails[];
}) {
  const [team, setTeam] = useState("all");
  const teamNames = useMemo(
    () => [...new Set(submissions.map((submission) => submission.team_name))].sort(),
    [submissions],
  );
  const visibleSubmissions = team === "all"
    ? submissions
    : submissions.filter((submission) => submission.team_name === team);

  return (
    <div className="flex flex-col gap-4">
      <div className="osrs-panel flex flex-wrap items-center gap-3 p-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Team</span>
          <select className="osrs-input min-w-44" value={team} onChange={(event) => setTeam(event.target.value)}>
            <option value="all">All teams</option>
            {teamNames.map((teamName) => (
              <option key={teamName} value={teamName}>{teamName}</option>
            ))}
          </select>
        </label>
        <span className="text-sm text-osrs-text-muted">
          {visibleSubmissions.length} drop{visibleSubmissions.length === 1 ? "" : "s"}
        </span>
      </div>

      {visibleSubmissions.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleSubmissions.map((submission) => (
            <article key={submission.id} className="osrs-panel flex gap-4 p-4">
              <a
                href={resolveStoredImageUrl(submission.image_url)}
                target="_blank"
                rel="noreferrer"
                className="relative h-24 w-32 shrink-0 overflow-hidden rounded border border-osrs-border bg-osrs-panel-dark"
              >
                <Image
                  src={resolveStoredImageUrl(submission.image_url)}
                  alt={`${submission.player_username}'s ${submission.tile_name} drop`}
                  fill
                  sizes="128px"
                  className="object-cover"
                  unoptimized
                />
              </a>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-osrs-gold">
                  {submission.team_name}
                </div>
                <h2 className="truncate text-lg">
                  #{submission.tile_position} {submission.tile_name}
                </h2>
                <p className="text-sm">
                  Logged by <span className="font-semibold text-osrs-text-bright">{submission.player_username}</span>
                </p>
                <time className="mt-1 block text-xs text-osrs-text-muted" dateTime={submission.submitted_at}>
                  {formatSubmittedAt(submission.submitted_at)}
                </time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="osrs-panel p-8 text-center text-osrs-text-muted">
          No drops match this filter.
        </div>
      )}
    </div>
  );
}
