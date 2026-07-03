"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface BossSearchProps {
  value: string;
  onSelect: (name: string, imageUrl: string) => void;
}

export default function BossSearch({ value, onSelect }: BossSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value changes (e.g. when editor is reset)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Reset keyboard selection when the result list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Scroll the highlighted item into view when navigating by keyboard
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(newQuery: string) {
    setQuery(newQuery);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (newQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/bosses/search?q=${encodeURIComponent(newQuery.trim())}`);
        const data = (await response.json()) as { results?: string[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
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
          void handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  async function handleSelect(name: string) {
    setQuery(name);
    setOpen(false);
    setResults([]);
    setActiveIndex(-1);
    setFetchingImage(true);
    try {
      const response = await fetch(`/api/bosses/image?name=${encodeURIComponent(name)}`);
      const data = (await response.json()) as { imageUrl?: string | null };
      onSelect(name, data.imageUrl ?? "");
    } catch {
      onSelect(name, "");
    } finally {
      setFetchingImage(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          className="osrs-input"
          type="text"
          placeholder="Search boss name..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
        />
        {(loading || fetchingImage) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-osrs-text-muted text-xs">
            {fetchingImage ? "Loading image…" : "Searching…"}
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded border border-osrs-border bg-osrs-panel shadow-lg"
        >
          {results.map((name, index) => (
            <BossResultItem
              key={name}
              name={name}
              active={index === activeIndex}
              onSelect={handleSelect}
              onHover={() => setActiveIndex(index)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BossResultItem({
  name,
  active,
  onSelect,
  onHover,
}: {
  name: string;
  active: boolean;
  onSelect: (name: string) => void;
  onHover: () => void;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  async function prefetchImage() {
    if (imgSrc !== null) return;
    try {
      const response = await fetch(`/api/bosses/image?name=${encodeURIComponent(name)}`);
      const data = (await response.json()) as { imageUrl?: string | null };
      setImgSrc(data.imageUrl ?? "");
    } catch {
      setImgSrc("");
    }
  }

  return (
    <li>
      <button
        type="button"
        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-osrs-text transition-colors ${
          active ? "bg-osrs-button" : "hover:bg-osrs-panel-dark"
        }`}
        onMouseEnter={() => {
          onHover();
          void prefetchImage();
        }}
        onClick={() => onSelect(name)}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-osrs-border bg-osrs-panel-dark">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={name}
              fill
              sizes="40px"
              className="object-contain p-0.5"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-lg">⚔️</div>
          )}
        </div>
        <span className="truncate font-semibold">{name}</span>
      </button>
    </li>
  );
}
