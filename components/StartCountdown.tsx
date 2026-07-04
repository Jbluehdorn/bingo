"use client";

import { useEffect, useState } from "react";

function formatDuration(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Renders a live countdown to a UTC target date string.
 *  Automatically reloads the page when the countdown expires. */
export default function StartCountdown({ targetUtc }: { targetUtc: string }) {
  const target = new Date(targetUtc).getTime();
  const [remaining, setRemaining] = useState(target - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const diff = target - Date.now();
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(id);
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  const localTime = new Date(targetUtc).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (remaining <= 0) {
    return <span className="font-semibold text-osrs-text-bright">Starting now…</span>;
  }

  return (
    <span>
      Starts in <span className="font-mono font-semibold text-osrs-text-bright">{formatDuration(remaining)}</span>
      <span className="ml-2 text-osrs-text-muted text-xs">({localTime} your time)</span>
    </span>
  );
}
