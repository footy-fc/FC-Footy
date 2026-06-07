"use client";

/**
 * ChannelCastFeed
 *
 * Displays casts from the /football Farcaster channel fetched via our
 * /api/farcaster/feed/channel proxy (which in turn calls the snapchain node).
 *
 * Filters:
 *   Latest  – newest first (server order)
 *   Top     – sorted by likes_count descending (client-side on loaded casts)
 *   Media   – only casts that contain image embeds
 */

import React from "react";
import SocialCastCard from "~/components/social/SocialCastCard";
import type { SocialFeedCast } from "~/components/social/types";
import Image from "next/image";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FilterKey = "latest" | "top" | "media";

interface ChannelFeedResponse {
  ok: boolean;
  casts?: SocialFeedCast[];
  nextCursor?: string | null;
  error?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"];

function hasImageEmbed(cast: SocialFeedCast): boolean {
  return (cast.embeds ?? []).some((e) => {
    if (!e.url) return false;
    const normalized = e.url.split("?")[0]?.toLowerCase() ?? "";
    return IMAGE_EXTENSIONS.some((ext) => normalized.endsWith(ext));
  });
}

function applyFilter(casts: SocialFeedCast[], filter: FilterKey): SocialFeedCast[] {
  switch (filter) {
    case "top":
      return [...casts].sort(
        (a, b) =>
          (b.reactions?.likes_count ?? 0) - (a.reactions?.likes_count ?? 0)
      );
    case "media":
      return casts.filter(hasImageEmbed);
    case "latest":
    default:
      return casts;
  }
}

// ─── Filter pill button ────────────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150",
        active
          ? "bg-deepPink text-notWhite shadow-[0_0_8px_rgba(189,25,93,0.5)]"
          : "border border-limeGreenOpacity/30 text-lightPurple/70 hover:border-limeGreenOpacity/60 hover:text-lightPurple",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface ChannelCastFeedProps {
  channel?: string;
  initialLimit?: number;
}

export default function ChannelCastFeed({
  channel = "football",
  initialLimit = 20,
}: ChannelCastFeedProps) {
  const [casts, setCasts] = React.useState<SocialFeedCast[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<FilterKey>("latest");

  // ── Fetch page ───────────────────────────────────────────────────────────────

  const fetchPage = React.useCallback(
    async (cursor?: string | null, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          channel,
          limit: String(initialLimit),
        });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/farcaster/feed/channel?${params.toString()}`);
        const payload = (await res.json().catch(() => ({}))) as ChannelFeedResponse;

        if (!res.ok || !payload.ok) {
          throw new Error(payload.error ?? "Failed to load channel feed");
        }

        const incoming = Array.isArray(payload.casts) ? payload.casts : [];

        setCasts((prev) => (append ? [...prev, ...incoming] : incoming));
        setNextCursor(payload.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [channel, initialLimit]
  );

  React.useEffect(() => {
    void fetchPage(null, false);
  }, [fetchPage]);

  // ── Derived list ─────────────────────────────────────────────────────────────

  const displayedCasts = React.useMemo(() => applyFilter(casts, filter), [casts, filter]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const filters: { key: FilterKey; label: string }[] = [
    { key: "latest", label: "Latest" },
    { key: "top", label: "Top" },
    { key: "media", label: "Media" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-base">⚽</span>
          <span className="text-sm font-semibold text-notWhite">/football channel</span>
        </div>
        {/* Refresh */}
        <button
          onClick={() => void fetchPage(null, false)}
          disabled={loading}
          className="p-1.5 rounded-full border border-limeGreenOpacity/20 text-lightPurple/60 hover:text-lightPurple hover:border-limeGreenOpacity/50 transition-colors disabled:opacity-40"
          aria-label="Refresh feed"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        {filters.map(({ key, label }) => (
          <FilterPill
            key={key}
            label={label}
            active={filter === key}
            onClick={() => setFilter(key)}
          />
        ))}
        {filter === "media" && displayedCasts.length === 0 && !loading && (
          <span className="text-xs text-lightPurple/50 ml-1">No image posts loaded yet</span>
        )}
      </div>

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-10 text-lightPurple/60">
          <Image src="/defifa_spinner.gif" alt="Loading" width={36} height={36} />
          <span className="text-xs">Loading /football channel…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-[18px] border border-deepPink/30 bg-purplePanel p-4 text-center">
          <p className="text-sm text-fontRed mb-3">{error}</p>
          <button
            onClick={() => void fetchPage(null, false)}
            className="px-4 py-2 text-xs font-semibold rounded-full bg-deepPink text-notWhite hover:bg-deepPink/80 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && displayedCasts.length === 0 && (
        <div className="rounded-[18px] border border-limeGreenOpacity/20 bg-purplePanel p-6 text-center text-lightPurple/60 text-sm">
          {filter === "media"
            ? "No posts with images found. Try Latest or Top."
            : "No casts found in /football channel yet."}
        </div>
      )}

      {/* Cast list */}
      {!loading && displayedCasts.length > 0 && (
        <div className="flex flex-col gap-3">
          {displayedCasts.map((cast) => (
            <SocialCastCard
              key={cast.hash}
              cast={cast}
              actionHref={`https://warpcast.com/~/conversations/${cast.hash.replace(/^0x/, '')}`}
              actionLabel="View"
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && !error && nextCursor && filter === "latest" && (
        <button
          onClick={() => void fetchPage(nextCursor, true)}
          disabled={loadingMore}
          className="w-full py-3 rounded-[18px] border border-limeGreenOpacity/20 text-lightPurple/70 text-xs font-semibold hover:border-limeGreenOpacity/50 hover:text-lightPurple transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}

      {/* Note on filters that operate on already-loaded set */}
      {!loading && !error && (filter === "top" || filter === "media") && nextCursor && (
        <p className="text-center text-[11px] text-lightPurple/40 px-2">
          Filtering across {casts.length} loaded casts. Switch to Latest and load more to expand the pool.
        </p>
      )}
    </div>
  );
}
