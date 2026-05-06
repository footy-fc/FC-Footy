"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

const SLIDE_HEIGHT = 480;
const SWIPE_THRESHOLD = 45;

// ── Skeleton ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div
      className="w-full rounded-[22px] bg-purplePanel animate-pulse overflow-hidden relative"
      style={{ height: SLIDE_HEIGHT }}
    >
      <div className="absolute inset-0 bg-white/5" />
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="h-2.5 w-24 bg-white/10 rounded-full" />
        <div className="h-4 w-4/5 bg-white/10 rounded-full" />
      </div>
    </div>
  );
}

// ── Fullscreen overlay player ─────────────────────────────────────
function VideoOverlay({
  highlight,
  onClose,
}: {
  highlight: VideoHighlight;
  onClose: () => void;
}) {
  const embedUrl = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-widest text-deepPink uppercase truncate">
            {highlight.league}
          </p>
          <p className="text-[13px] font-semibold text-white leading-tight line-clamp-1">
            {highlight.event}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 relative bg-black">
        <iframe
          src={embedUrl}
          title={highlight.event}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
}

// ── Thumbnail slide ───────────────────────────────────────────────
function VideoSlide({
  highlight,
  index,
  total,
  onPlay,
}: {
  highlight: VideoHighlight;
  index: number;
  total: number;
  onPlay: () => void;
}) {
  const thumbUrl =
    highlight.thumbnailUrl ||
    `https://img.youtube.com/vi/${highlight.videoId}/hqdefault.jpg`;

  const freshnessLabel =
    highlight.hoursAgo <= 1
      ? "🔴 Just now"
      : highlight.hoursAgo < 6
      ? `🔴 ${highlight.hoursAgo}h ago`
      : highlight.hoursAgo < 24
      ? `${highlight.hoursAgo}h ago`
      : "Yesterday";

  const freshnessColor =
    highlight.hoursAgo < 6 ? "text-limeGreen" : "text-lightPurple/60";

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ height: SLIDE_HEIGHT }}
    >
      <Image
        src={thumbUrl}
        alt={highlight.event}
        fill
        className="object-cover"
        unoptimized
        priority={index === 0}
      />
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

      {/* Play button */}
      <button
        onClick={onPlay}
        className="absolute inset-0 flex items-center justify-center"
        aria-label={`Play ${highlight.event}`}
      >
        <div className="w-16 h-16 rounded-full bg-deepPink/90 flex items-center justify-center shadow-[0_0_32px_rgba(189,25,93,0.7)] active:scale-95 transition-transform">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white ml-1" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </button>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black tracking-[0.18em] text-deepPink uppercase">
            {highlight.league}
          </span>
          <span className={`text-[10px] font-bold ${freshnessColor}`}>
            {freshnessLabel}
          </span>
        </div>
        <p className="text-[15px] font-bold text-white leading-snug line-clamp-2">
          {highlight.event}
        </p>
      </div>

      {/* Dot indicator */}
      <div className="absolute top-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
        {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
          <span
            key={i}
            className={`block rounded-full transition-all duration-200 ${
              i === index ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      {index === 0 && (
        <div className="absolute bottom-24 inset-x-0 flex flex-col items-center gap-1 pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/40 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          <span className="text-[10px] text-white/30 font-medium">Swipe for more</span>
        </div>
      )}
    </div>
  );
}

// ── Main Feed ─────────────────────────────────────────────────────
export default function HighlightsFeed() {
  const [highlights, setHighlights] = useState<VideoHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoHighlight | null>(null);

  // Rendering state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // All mutable values for event handlers live in a ref to avoid stale closures
  const s = useRef({
    isDragging: false,
    startY: 0,
    startTime: 0,
    delta: 0,
    index: 0,
    total: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with highlights length
  useEffect(() => {
    s.current.total = highlights.length;
  }, [highlights.length]);

  // Keep ref in sync with currentIndex
  useEffect(() => {
    s.current.index = currentIndex;
  }, [currentIndex]);

  // ── Data fetch ───────────────────────────────────────────────
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

  // ── Non-passive touch listeners (attached via ref, not React props) ──
  // This is the ONLY way to call e.preventDefault() and stop parent scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onStart(e: TouchEvent) {
      s.current.isDragging = true;
      s.current.startY = e.touches[0].clientY;
      s.current.startTime = Date.now();
      s.current.delta = 0;
      setIsDragging(true);
      setDragDeltaY(0);
    }

    function onMove(e: TouchEvent) {
      if (!s.current.isDragging) return;
      // CRITICAL: prevent parent page from scrolling
      e.preventDefault();

      const raw = e.touches[0].clientY - s.current.startY;
      const atTop = s.current.index === 0 && raw > 0;
      const atBottom = s.current.index === s.current.total - 1 && raw < 0;
      const delta = atTop || atBottom ? raw * 0.18 : raw;
      s.current.delta = delta;
      setDragDeltaY(delta);
    }

    function onEnd() {
      if (!s.current.isDragging) return;
      s.current.isDragging = false;
      setIsDragging(false);

      const { delta, index, total, startTime } = s.current;
      const elapsed = Math.max(1, Date.now() - startTime);
      const velocity = Math.abs(delta) / elapsed; // px/ms
      const isFlick = velocity > 0.35;

      if ((Math.abs(delta) > SWIPE_THRESHOLD || isFlick) && delta < 0 && index < total - 1) {
        const next = index + 1;
        s.current.index = next;
        setCurrentIndex(next);
      } else if ((Math.abs(delta) > SWIPE_THRESHOLD || isFlick) && delta > 0 && index > 0) {
        const prev = index - 1;
        s.current.index = prev;
        setCurrentIndex(prev);
      }

      s.current.delta = 0;
      setDragDeltaY(0);
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false }); // ← non-passive = can preventDefault
    el.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, []); // attach once, read state via s ref

  const translateY = -currentIndex * SLIDE_HEIGHT + dragDeltaY;
  const transition = isDragging
    ? "none"
    : "transform 0.36s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

  return (
    <>
      {activeVideo && (
        <VideoOverlay highlight={activeVideo} onClose={() => setActiveVideo(null)} />
      )}

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🎬</span>
          <span className="text-[11px] font-black tracking-[0.14em] text-notWhite uppercase">
            Highlights
          </span>
          <span className="text-[10px] text-lightPurple/50 ml-auto">
            Swipe up · tap to watch
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
            No highlight videos in the last 30 hours — check back soon.
          </div>
        )}

        {!loading && !error && highlights.length > 0 && (
          <div
            ref={containerRef}
            className="overflow-hidden rounded-[22px] select-none touch-none"
            style={{ height: SLIDE_HEIGHT }}
          >
            <div
              style={{
                transform: `translateY(${translateY}px)`,
                transition,
                willChange: "transform",
                height: highlights.length * SLIDE_HEIGHT,
              }}
            >
              {highlights.map((h, i) => (
                <VideoSlide
                  key={h.id}
                  highlight={h}
                  index={i}
                  total={highlights.length}
                  onPlay={() => setActiveVideo(h)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
