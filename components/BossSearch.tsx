"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import type { BossEntry } from "@/lib/types";
import bossData from "@/data/bosses.json";

const BOSSES = bossData as BossEntry[];

function searchBosses(query: string): BossEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: BossEntry[] = [];
  const seen = new Set<string>();

  for (const boss of BOSSES) {
    if (seen.has(boss.id)) continue;
    const nameMatch = boss.name.toLowerCase().includes(q);
    const titleMatch = boss.title.toLowerCase().includes(q);
    const groupMatch = boss.group?.toLowerCase().includes(q) ?? false;
    if (nameMatch || titleMatch || groupMatch) {
      results.push(boss);
      seen.add(boss.id);
    }
  }
  return results;
}

interface BossSearchProps {
  value: string;
  onSelect: (boss: BossEntry) => void;
}

export default function BossSearch({ value, onSelect }: BossSearchProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => searchBosses(query), [query]);

  // Sync external value changes (e.g. when editor is reset)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Reset keyboard selection when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(newQuery: string) {
    setQuery(newQuery);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  function handleSelect(boss: BossEntry) {
    setQuery(boss.name);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(boss);
  }

  // Group results for display
  const grouped = useMemo(() => {
    const map = new Map<string, BossEntry[]>();
    for (const boss of results) {
      const key = boss.group ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(boss);
    }
    return map;
  }, [results]);

  return (
    <div ref={containerRef} className="relative">
      <input
        className="osrs-input"
        type="text"
        placeholder="Search boss or group (e.g. God Wars Dungeon)…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
      />

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded border border-osrs-border bg-osrs-panel shadow-lg"
        >
          {[...grouped.entries()].map(([groupName, bosses]) => (
            <li key={groupName}>
              {grouped.size > 1 || bosses[0].group !== null ? (
                <div className="sticky top-0 bg-osrs-panel-dark px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-osrs-text-muted">
                  {groupName}
                </div>
              ) : null}
              {bosses.map((boss) => {
                const flatIndex = results.indexOf(boss);
                return (
                  <button
                    key={boss.id}
                    type="button"
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-osrs-text transition-colors ${
                      flatIndex === activeIndex ? "bg-osrs-button" : "hover:bg-osrs-panel-dark"
                    }`}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    onClick={() => handleSelect(boss)}
                  >
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-osrs-border bg-osrs-panel-dark">
                      {boss.imageUrl ? (
                        <Image
                          src={boss.imageUrl}
                          alt={boss.name}
                          fill
                          sizes="36px"
                          className="object-contain p-0.5"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-base">⚔️</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{boss.name}</div>
                      <div className="truncate text-xs text-osrs-text-muted">{boss.title}</div>
                    </div>
                  </button>
                );
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

