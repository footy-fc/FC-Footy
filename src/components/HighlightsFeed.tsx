"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

const SWIPE_THRESHOLD = 40;

// ── Fullscreen video player overlay ──────────────────────────────
function VideoPlayer({
  highlight,
  onClose,
}: {
  highlight: VideoHighlight;
  onClose: () => void;
}) {
  const embedUrl = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-black shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-widest text-deepPink uppercase">{highlight.league}</p>
          <p className="text-[13px] font-semibold text-white line-clamp-1">{highlight.event}</p>
        </div>
      </div>
      <div className="flex-1 relative">
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

// ── Single slide (thumbnail only — no iframe in swipe track) ─────
function Slide({
  highlight,
  index,
  total,
  height,
  onPlay,
}: {
  highlight: VideoHighlight;
  index: number;
  total: number;
  height: number;
  onPlay: () => void;
}) {
  const thumbUrl =
    highlight.thumbnailUrl ||
    `https://img.youtube.com/vi/${highlight.videoId}/hqdefault.jpg`;

  const age =
    highlight.hoursAgo <= 1
      ? "🔴 Just now"
      : highlight.hoursAgo < 24
      ? `🔴 ${highlight.hoursAgo}h ago`
      : "Yesterday";

  return (
    <div className="relative w-full bg-black overflow-hidden shrink-0" style={{ height }}>
      {/* Full-bleed thumbnail */}
      <Image
        src={thumbUrl}
        alt={highlight.event}
        fill
        className="object-cover"
        unoptimized
        priority={index <= 1}
      />

      {/* Gradient vignette — stronger at bottom like TikTok */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" style={{ backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 35%, transparent 65%)" }} />

      {/* Top: progress dots */}
      <div className="absolute top-4 inset-x-0 flex justify-center gap-1.5 pointer-events-none px-6">
        {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[2px] rounded-full max-w-[32px] overflow-hidden bg-white/20"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                i === index ? "bg-white w-full" : i < index ? "bg-white/50 w-full" : "w-0"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Bottom info — TikTok style */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-20 pointer-events-none">
        {/* League + freshness */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-black tracking-widest text-deepPink uppercase">
            {highlight.league}
          </span>
          <span className="text-[11px] text-limeGreen font-bold">{age}</span>
        </div>
        {/* Match title */}
        <p className="text-[17px] font-bold text-white leading-snug line-clamp-2 mb-5">
          {highlight.event}
        </p>
        {/* Swipe hint on first */}
        {index === 0 && (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 text-white/50">
              <svg viewBox="0 0 24 24" className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span className="text-[11px]">Swipe up for next</span>
            </div>
          </div>
        )}
      </div>

      {/* Right-side actions — TikTok style */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        {/* Play button */}
        <button
          onClick={onPlay}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-deepPink flex items-center justify-center shadow-[0_0_20px_rgba(189,25,93,0.7)]">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white ml-0.5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-[10px] text-white/80 font-semibold">Watch</span>
        </button>

        {/* Index counter */}
        <div className="flex flex-col items-center">
          <span className="text-[18px] font-black text-white">{index + 1}</span>
          <span className="text-[10px] text-white/50">of {total}</span>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────
function Skeleton({ height }: { height: number }) {
  return (
    <div className="w-full bg-black animate-pulse flex flex-col justify-end pb-8 px-4" style={{ height }}>
      <div className="h-2 w-20 bg-white/10 rounded mb-3" />
      <div className="h-5 w-3/4 bg-white/10 rounded mb-2" />
      <div className="h-4 w-1/2 bg-white/10 rounded" />
    </div>
  );
}

// ── Main Feed ─────────────────────────────────────────────────────
export default function HighlightsFeed() {
  const [highlights, setHighlights] = useState<VideoHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoHighlight | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [slideHeight, setSlideHeight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // All handler state in a ref (avoids stale closures in native listeners)
  const s = useRef({
    isDragging: false,
    startY: 0,
    startTime: 0,
    delta: 0,
    index: 0,
    total: 0,
  });

  // Measure container height dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSlideHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync index and total to ref
  useEffect(() => { s.current.index = currentIndex; }, [currentIndex]);
  useEffect(() => { s.current.total = highlights.length; }, [highlights.length]);

  // Fetch highlights
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
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

  // ── Non-passive touch listeners — only way to preventDefault ───
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
      e.preventDefault(); // block parent scroll — only works with passive:false
      const raw = e.touches[0].clientY - s.current.startY;
      const atTop = s.current.index === 0 && raw > 0;
      const atBottom = s.current.index === s.current.total - 1 && raw < 0;
      const delta = atTop || atBottom ? raw * 0.15 : raw;
      s.current.delta = delta;
      setDragDeltaY(delta);
    }

    function onEnd() {
      if (!s.current.isDragging) return;
      s.current.isDragging = false;
      setIsDragging(false);

      const { delta, index, total, startTime } = s.current;
      const elapsed = Math.max(1, Date.now() - startTime);
      const velocity = Math.abs(delta) / elapsed;
      const commit = Math.abs(delta) > SWIPE_THRESHOLD || velocity > 0.3;

      if (commit && delta < 0 && index < total - 1) {
        const n = index + 1;
        s.current.index = n;
        setCurrentIndex(n);
      } else if (commit && delta > 0 && index > 0) {
        const n = index - 1;
        s.current.index = n;
        setCurrentIndex(n);
      }
      s.current.delta = 0;
      setDragDeltaY(0);
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  const translateY =
    slideHeight > 0 ? -currentIndex * slideHeight + dragDeltaY : 0;

  const transition = isDragging
    ? "none"
    : "transform 0.32s cubic-bezier(0.23, 1, 0.32, 1)";

  return (
    <>
      {activeVideo && (
        <VideoPlayer highlight={activeVideo} onClose={() => setActiveVideo(null)} />
      )}

      {/* Full container — fills whatever space HighlightsTab gives us */}
      <div ref={containerRef} className="w-full h-full overflow-hidden bg-black select-none">
        {loading && <Skeleton height={slideHeight || 500} />}

        {!loading && error && (
          <div className="flex items-center justify-center h-full text-white/50 text-sm p-8 text-center">
            Couldn&apos;t load highlights right now. Try again later.
          </div>
        )}

        {!loading && !error && highlights.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/50 p-8 text-center gap-3">
            <span className="text-4xl">⚽</span>
            <p className="text-sm">No highlight videos in the last 30 hours.</p>
            <p className="text-xs text-white/30">Check back after matches finish.</p>
          </div>
        )}

        {!loading && !error && highlights.length > 0 && slideHeight > 0 && (
          <div
            style={{
              transform: `translateY(${translateY}px)`,
              transition,
              willChange: "transform",
              height: highlights.length * slideHeight,
            }}
          >
            {highlights.map((h, i) => (
              <Slide
                key={h.id}
                highlight={h}
                index={i}
                total={highlights.length}
                height={slideHeight}
                onPlay={() => setActiveVideo(h)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
