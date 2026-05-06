"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

const SLIDE_HEIGHT = 480;
const SWIPE_THRESHOLD = 50; // px of drag to commit to next/prev slide

// ── Skeleton ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div
      className="w-full rounded-[22px] bg-purplePanel animate-pulse overflow-hidden relative"
      style={{ height: SLIDE_HEIGHT }}
    >
      <div className="absolute inset-0 bg-white/5" />
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="h-2.5 w-20 bg-white/10 rounded-full" />
        <div className="h-4 w-3/4 bg-white/10 rounded-full" />
      </div>
    </div>
  );
}

// ── Individual video slide ────────────────────────────────────────
function VideoSlide({
  highlight,
  index,
  total,
  isActive,
}: {
  highlight: VideoHighlight;
  index: number;
  total: number;
  isActive: boolean;
}) {
  const thumbUrl =
    `https://img.youtube.com/vi/${highlight.videoId}/maxresdefault.jpg` ||
    highlight.thumbnailUrl;

  const embedUrl = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

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
      className="relative w-full bg-black overflow-hidden"
      style={{ height: SLIDE_HEIGHT }}
    >
      {/* ── Player or Thumbnail ── */}
      {isActive ? (
        <iframe
          key={highlight.videoId}
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

      {/* ── Bottom gradient + info ── */}
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] font-black tracking-[0.18em] text-deepPink uppercase">
            {highlight.league}
          </p>
          <span className={`text-[10px] font-bold ${freshnessColor}`}>
            {freshnessLabel}
          </span>
        </div>
        <p className="text-[15px] font-bold text-white leading-snug line-clamp-2">
          {highlight.event}
        </p>
      </div>

      {/* ── Dot indicator (top-centre) ── */}
      <div className="absolute top-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`block rounded-full transition-all duration-300 ${
              i === index
                ? "w-4 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* ── Swipe hint on first slide when not active ── */}
      {index === 0 && !isActive && (
        <div className="absolute bottom-20 inset-x-0 flex flex-col items-center gap-1 pointer-events-none">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-white/50 animate-bounce"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          <span className="text-[10px] text-white/40 font-medium">Swipe up</span>
        </div>
      )}
    </div>
  );
}

// ── Main Feed Component ───────────────────────────────────────────
export default function HighlightsFeed() {
  const [highlights, setHighlights] = useState<VideoHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Swipe state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

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
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Touch handlers ────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
    setDragDeltaY(0);
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const delta = e.touches[0].clientY - dragStartY.current;
      // Resist at edges
      const atStart = currentIndex === 0 && delta > 0;
      const atEnd = currentIndex === highlights.length - 1 && delta < 0;
      if (atStart || atEnd) {
        setDragDeltaY(delta / 4); // rubber-band effect
      } else {
        setDragDeltaY(delta);
      }
    },
    [isDragging, currentIndex, highlights.length]
  );

  const onTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragDeltaY < -SWIPE_THRESHOLD && currentIndex < highlights.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else if (dragDeltaY > SWIPE_THRESHOLD && currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
    setDragDeltaY(0);
  }, [dragDeltaY, currentIndex, highlights.length]);

  // ── Translate: base position + live drag offset ───────────────
  const translateY = -currentIndex * SLIDE_HEIGHT + dragDeltaY;
  const transition = isDragging
    ? "none"
    : "transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🎬</span>
        <span className="text-[11px] font-black tracking-[0.14em] text-notWhite uppercase">
          Highlights
        </span>
        <span className="text-[10px] text-lightPurple/50 ml-auto">
          Swipe up
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

      {/* ── Touch-driven vertical swipe player ── */}
      {!loading && !error && highlights.length > 0 && (
        <div
          className="overflow-hidden rounded-[22px] select-none"
          style={{ height: SLIDE_HEIGHT, touchAction: "pan-y" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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
                isActive={i === currentIndex}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
