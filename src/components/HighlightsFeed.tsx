"use client";

import React, { useEffect, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";
import { sdk } from "@farcaster/miniapp-sdk";

// ── Skeleton Card ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="shrink-0 w-[260px] rounded-[20px] border border-limeGreenOpacity/10 bg-purplePanel overflow-hidden animate-pulse">
      <div className="w-full h-[146px] bg-white/10" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 bg-white/10 rounded-full" />
        <div className="h-2.5 w-1/2 bg-white/10 rounded-full" />
      </div>
    </div>
  );
}

// ── Video Card ───────────────────────────────────────────────────
function VideoCard({ highlight }: { highlight: VideoHighlight }) {
  const handleOpen = async () => {
    try {
      // In mini-app context, open in the in-app browser
      await sdk.actions.openUrl(highlight.youtubeUrl);
    } catch {
      // Fallback for browser context
      window.open(highlight.youtubeUrl, "_blank", "noopener");
    }
  };

  const thumbUrl =
    highlight.thumbnailUrl ||
    `https://img.youtube.com/vi/${highlight.videoId}/hqdefault.jpg`;

  return (
    <button
      onClick={handleOpen}
      className="group shrink-0 w-[260px] rounded-[20px] border border-limeGreenOpacity/15 bg-purplePanel overflow-hidden text-left transition-all hover:border-deepPink/40 hover:shadow-[0_8px_30px_rgba(189,25,93,0.2)] active:scale-[0.98]"
    >
      {/* Thumbnail */}
      <div className="relative w-full h-[146px] overflow-hidden bg-darkPurple">
        <Image
          src={thumbUrl}
          alt={highlight.event}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
          <div className="w-12 h-12 rounded-full bg-deepPink/90 flex items-center justify-center shadow-[0_0_24px_rgba(189,25,93,0.6)] group-hover:scale-110 transition-transform">
            {/* Play triangle */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white ml-0.5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* YouTube badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 rounded px-1.5 py-0.5">
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#FF0000">
            <path d="M23.5 6.2s-.2-1.7-1-2.4c-.9-1-1.9-1-2.4-1C17.1 2.6 12 2.6 12 2.6s-5.1 0-8.1.2c-.5.1-1.5.1-2.4 1-.7.7-1 2.4-1 2.4S.3 8.1.3 10v1.8c0 1.9.2 3.8.2 3.8s.2 1.7 1 2.4c.9 1 2.1.9 2.6 1C5.8 19.2 12 19.2 12 19.2s5.1 0 8.1-.2c.5-.1 1.5-.1 2.4-1 .7-.7 1-2.4 1-2.4s.2-1.9.2-3.8V10c0-1.9-.2-3.8-.2-3.8z" />
            <path d="M9.7 14.2V8.6l6.5 2.8-6.5 2.8z" fill="white" />
          </svg>
          <span className="text-[9px] font-bold text-white">YouTube</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[12px] font-semibold text-notWhite leading-[1.4] line-clamp-2 mb-1">
          {highlight.event}
        </p>
        <p className="text-[10px] text-lightPurple/60 font-medium truncate">
          {highlight.league}
        </p>
      </div>
    </button>
  );
}

// ── Main Feed Component ──────────────────────────────────────────
export default function HighlightsFeed() {
  const [highlights, setHighlights] = useState<VideoHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch("/api/highlights");
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as VideoHighlight[];
        if (!cancelled) setHighlights(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🎬</span>
        <span className="text-[11px] font-black tracking-[0.14em] text-notWhite uppercase">
          Highlights
        </span>
        <span className="text-[10px] text-lightPurple/50 ml-auto">
          Recent matches
        </span>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {[0, 1, 2].map((i) => (
            <div key={i} className="snap-start">
              <SkeletonCard />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-[18px] border border-fontRed/20 bg-purplePanel p-4 text-sm text-lightPurple/70 text-center">
          Couldn&apos;t load highlights right now.
        </div>
      )}

      {/* Empty */}
      {!loading && !error && highlights.length === 0 && (
        <div className="rounded-[18px] border border-limeGreenOpacity/10 bg-purplePanel p-4 text-sm text-lightPurple/70 text-center">
          No highlight videos available yet — check back after matches finish.
        </div>
      )}

      {/* Video Cards */}
      {!loading && !error && highlights.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {highlights.map((h) => (
            <div key={h.id} className="snap-start">
              <VideoCard highlight={h} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
