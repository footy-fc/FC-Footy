"use client";

import React, { useEffect, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

// ── Skeleton Card ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="shrink-0 w-[280px] rounded-[20px] border border-limeGreenOpacity/10 bg-purplePanel overflow-hidden animate-pulse">
      <div className="w-full h-[157px] bg-white/10" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 bg-white/10 rounded-full" />
        <div className="h-2.5 w-1/2 bg-white/10 rounded-full" />
      </div>
    </div>
  );
}

// ── Video Card: thumbnail → tap → inline iframe player ───────────
function VideoCard({ highlight }: { highlight: VideoHighlight }) {
  const [playing, setPlaying] = useState(false);

  const thumbUrl =
    highlight.thumbnailUrl ||
    `https://img.youtube.com/vi/${highlight.videoId}/hqdefault.jpg`;

  const embedUrl = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div className="shrink-0 w-[280px] rounded-[20px] border border-limeGreenOpacity/15 bg-purplePanel overflow-hidden">
      {/* Video area: thumb → iframe on tap */}
      <div className="relative w-full h-[157px] bg-black overflow-hidden">
        {playing ? (
          /* ── Inline YouTube embed ── */
          <iframe
            src={embedUrl}
            title={highlight.event}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        ) : (
          /* ── Thumbnail + play button ── */
          <button
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 w-full h-full"
            aria-label={`Play ${highlight.event} highlights`}
          >
            <Image
              src={thumbUrl}
              alt={highlight.event}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            {/* Dark scrim */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-deepPink/90 flex items-center justify-center shadow-[0_0_28px_rgba(189,25,93,0.65)] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white ml-1" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {/* YouTube badge */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/75 rounded px-1.5 py-0.5">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#FF0000">
                <path d="M23.5 6.2s-.2-1.7-1-2.4c-.9-1-1.9-1-2.4-1C17.1 2.6 12 2.6 12 2.6s-5.1 0-8.1.2c-.5.1-1.5.1-2.4 1-.7.7-1 2.4-1 2.4S.3 8.1.3 10v1.8c0 1.9.2 3.8.2 3.8s.2 1.7 1 2.4c.9 1 2.1.9 2.6 1C5.8 19.2 12 19.2 12 19.2s5.1 0 8.1-.2c.5-.1 1.5-.1 2.4-1 .7-.7 1-2.4 1-2.4s.2-1.9.2-3.8V10c0-1.9-.2-3.8-.2-3.8z" />
                <path d="M9.7 14.2V8.6l6.5 2.8-6.5 2.8z" fill="white" />
              </svg>
              <span className="text-[9px] font-bold text-white">YouTube</span>
            </div>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-notWhite leading-[1.4] line-clamp-2 mb-0.5">
            {highlight.event}
          </p>
          <p className="text-[10px] text-lightPurple/60 font-medium truncate">
            {highlight.league}
          </p>
        </div>
        {/* Stop / replay button when playing */}
        {playing && (
          <button
            onClick={() => setPlaying(false)}
            className="shrink-0 text-lightPurple/50 hover:text-notWhite transition-colors mt-0.5"
            aria-label="Close player"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
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
          No highlight videos yet — check back after matches finish.
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
