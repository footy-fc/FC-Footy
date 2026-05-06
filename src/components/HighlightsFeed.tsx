"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

const SLIDE_HEIGHT = 480;
const SWIPE_THRESHOLD = 40;

// ── Fullscreen video player (opened on tap) ───────────────────────
function VideoPlayer({ highlight, onClose }: { highlight: VideoHighlight; onClose: () => void }) {
  const src = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-black/90 shrink-0">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-widest text-deepPink uppercase truncate">{highlight.league}</p>
          <p className="text-[13px] font-semibold text-white line-clamp-1">{highlight.event}</p>
        </div>
      </div>
      <div className="flex-1 relative">
        <iframe src={src} title={highlight.event}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen className="absolute inset-0 w-full h-full border-0" />
      </div>
    </div>
  );
}

// ── Slide — thumbnail only, NO iframe (iframes steal touch events) ─
function VideoSlide({ highlight, index, total, onPlay }: {
  highlight: VideoHighlight; index: number; total: number; onPlay: () => void;
}) {
  const thumbUrl = `https://img.youtube.com/vi/${highlight.videoId}/maxresdefault.jpg`;
  const freshnessLabel = highlight.daysAgo === 0 ? "🔴 Today" : highlight.daysAgo === 1 ? "Yesterday" : `${highlight.daysAgo}d ago`;
  const freshnessColor = highlight.daysAgo === 0 ? "text-limeGreen" : "text-lightPurple/60";

  return (
    <div className="relative w-full flex-shrink-0 bg-black overflow-hidden" style={{ height: SLIDE_HEIGHT }}>
      <Image src={thumbUrl} alt={highlight.event} fill className="object-cover" unoptimized priority={index <= 1} />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

      {/* Play button — centre */}
      <button onClick={onPlay} className="absolute inset-0 flex items-center justify-center group" aria-label={`Play ${highlight.event}`}>
        <div className="w-16 h-16 rounded-full bg-deepPink/90 flex items-center justify-center shadow-[0_0_28px_rgba(189,25,93,0.65)] group-active:scale-90 transition-transform">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white ml-1" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </button>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] font-black tracking-[0.18em] text-deepPink uppercase">{highlight.league}</p>
          <span className={`text-[10px] font-bold ${freshnessColor}`}>{freshnessLabel}</span>
        </div>
        <p className="text-[15px] font-bold text-white leading-snug line-clamp-2">{highlight.event}</p>
      </div>

      {/* Counter */}
      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-bold text-white">
        {index + 1}&thinsp;/&thinsp;{total}
      </div>

      {/* Swipe hint */}
      {index === 0 && (
        <div className="absolute bottom-20 inset-x-0 flex flex-col items-center gap-1 pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/40 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          <span className="text-[10px] text-white/30">Swipe for more</span>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="w-full rounded-[22px] bg-purplePanel animate-pulse overflow-hidden relative" style={{ height: SLIDE_HEIGHT }}>
      <div className="absolute inset-0 bg-white/5" />
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="h-2.5 w-20 bg-white/10 rounded-full" />
        <div className="h-4 w-3/4 bg-white/10 rounded-full" />
      </div>
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

  const containerRef = useRef<HTMLDivElement>(null);

  // All handler mutable state in a ref → no stale closures
  const s = useRef({ isDragging: false, startY: 0, startTime: 0, delta: 0, index: 0, total: 0 });

  useEffect(() => { s.current.index = currentIndex; }, [currentIndex]);
  useEffect(() => { s.current.total = highlights.length; }, [highlights.length]);

  // Data fetch
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

  // Non-passive touch listeners — the ONLY way to call e.preventDefault()
  // and stop the parent page from stealing swipe events.
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
      e.preventDefault(); // blocks parent scroll — requires passive:false below
      const raw = e.touches[0].clientY - s.current.startY;
      const atTop = s.current.index === 0 && raw > 0;
      const atBottom = s.current.index === s.current.total - 1 && raw < 0;
      const delta = (atTop || atBottom) ? raw * 0.15 : raw;
      s.current.delta = delta;
      setDragDeltaY(delta);
    }

    function onEnd() {
      if (!s.current.isDragging) return;
      s.current.isDragging = false;
      setIsDragging(false);
      const { delta, index, total, startTime } = s.current;
      const velocity = Math.abs(delta) / Math.max(1, Date.now() - startTime);
      const commit = Math.abs(delta) > SWIPE_THRESHOLD || velocity > 0.3;
      if (commit && delta < 0 && index < total - 1) {
        const n = index + 1; s.current.index = n; setCurrentIndex(n);
      } else if (commit && delta > 0 && index > 0) {
        const n = index - 1; s.current.index = n; setCurrentIndex(n);
      }
      s.current.delta = 0;
      setDragDeltaY(0);
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove",  onMove,  { passive: false }); // ← non-passive
    el.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, []); // attach once — state via ref

  const translateY = -currentIndex * SLIDE_HEIGHT + dragDeltaY;
  const transition = isDragging ? "none" : "transform 0.32s cubic-bezier(0.23, 1, 0.32, 1)";

  return (
    <>
      {activeVideo && <VideoPlayer highlight={activeVideo} onClose={() => setActiveVideo(null)} />}

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🎬</span>
          <span className="text-[11px] font-black tracking-[0.14em] text-notWhite uppercase">Highlights</span>
          <span className="text-[10px] text-lightPurple/50 ml-auto">Swipe to browse</span>
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

        {!loading && !error && highlights.length > 0 && (
          /* overflow:hidden + transform replaces snap-scroll — no jank, no parent scroll steal */
          <div
            ref={containerRef}
            className="overflow-hidden rounded-[22px] select-none touch-none"
            style={{ height: SLIDE_HEIGHT }}
          >
            <div style={{
              transform: `translateY(${translateY}px)`,
              transition,
              willChange: "transform",
              height: highlights.length * SLIDE_HEIGHT,
            }}>
              {highlights.map((h, i) => (
                <VideoSlide key={h.id} highlight={h} index={i} total={highlights.length} onPlay={() => setActiveVideo(h)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
