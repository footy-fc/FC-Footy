"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

// ── IntersectionObserver hook ────────────────────────────────────
function useInView(ref: React.RefObject<HTMLDivElement | null>, threshold = 0.8) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

// ── Individual video slide ────────────────────────────────────────
function VideoSlide({
  highlight,
  index,
  total,
}: {
  highlight: VideoHighlight;
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  // Use hqdefault or highlight.thumbnailUrl
  const thumbUrl =
    `https://img.youtube.com/vi/${highlight.videoId}/hqdefault.jpg` ||
    highlight.thumbnailUrl;

  // autoplay + playsinline + mute=1 helps it autoplay on mobile browsers without interaction
  const embedUrl = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&mute=1`;

  const freshnessLabel =
    highlight.daysAgo === 0
      ? "🔴 Today"
      : highlight.daysAgo === 1
      ? "Yesterday"
      : `${highlight.daysAgo}d ago`;

  const freshnessColor =
    highlight.daysAgo === 0 ? "text-limeGreen" : "text-lightPurple/60";

  return (
    <div
      ref={ref}
      className="snap-start relative w-full h-full flex-shrink-0 bg-black overflow-hidden"
    >
      {/* ── Player or Thumbnail ── */}
      {inView ? (
        <iframe
          key={highlight.videoId} // re-mount when id changes
          src={embedUrl}
          title={highlight.event}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <Image
          src={thumbUrl}
          alt={highlight.event}
          fill
          className="object-cover"
          unoptimized
          priority={index === 0}
        />
      )}

      {/* ── Bottom gradient + info overlay ── */}
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] font-black tracking-[0.18em] text-deepPink uppercase">
            {highlight.league}
          </p>
          <span className={`text-[10px] font-bold ${freshnessColor}`}>{freshnessLabel}</span>
        </div>
        <p className="text-[15px] font-bold text-white leading-snug line-clamp-2">
          {highlight.event}
        </p>
      </div>

      {/* ── Top-right counter ── */}
      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-bold text-white">
        {index + 1}&thinsp;/&thinsp;{total}
      </div>

      {/* ── Swipe hint on first slide (only when not playing) ── */}
      {index === 0 && !inView && (
        <div className="absolute bottom-20 inset-x-0 flex flex-col items-center gap-1 pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/50 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          <span className="text-[10px] text-white/40 font-medium">Swipe for more</span>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="w-full h-[480px] rounded-[22px] bg-purplePanel animate-pulse overflow-hidden relative">
      <div className="absolute inset-0 bg-white/5" />
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="h-2.5 w-20 bg-white/10 rounded-full" />
        <div className="h-4 w-3/4 bg-white/10 rounded-full" />
      </div>
    </div>
  );
}

// ── Main Feed Component ───────────────────────────────────────────
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
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as VideoHighlight[];
        if (!cancelled) setHighlights(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
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
          Swipe to browse
        </span>
      </div>

      {loading && <Skeleton />}

      {!loading && error && (
        <div className="rounded-[22px] border border-fontRed/20 bg-purplePanel p-6 text-sm text-lightPurple/70 text-center">
          Couldn&apos;t load highlights right now.
        </div>
      )}

      {!loading && !error && highlights.length === 0 && (
        <div className="rounded-[22px] border border-limeGreenOpacity/10 bg-purplePanel p-6 text-sm text-lightPurple/70 text-center">
          No highlight videos yet — check back after matches finish.
        </div>
      )}

      {/* ── TikTok/Shorts-style vertical snap scroll ── */}
      {!loading && !error && highlights.length > 0 && (
        <div
          className="overflow-y-auto snap-y snap-mandatory rounded-[22px] scrollbar-hide"
          style={{ height: "480px" }}
        >
          {highlights.map((h, i) => (
            <VideoSlide key={h.id} highlight={h} index={i} total={highlights.length} />
          ))}
        </div>
      )}
    </div>
  );
}
