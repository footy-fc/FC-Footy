"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

const SLIDE_HEIGHT = 480;

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

// ── IntersectionObserver hook ────────────────────────────────────
function useInView(ref: React.RefObject<HTMLDivElement | null>, threshold = 0.6) {
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

// ── Slide — thumbnail only, NO iframe (iframes steal touch events) ─
function VideoSlide({ highlight, index, total, onPlay }: {
  highlight: VideoHighlight; index: number; total: number; onPlay: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  const thumbUrl = `https://img.youtube.com/vi/${highlight.videoId}/maxresdefault.jpg`;
  const freshnessLabel = highlight.daysAgo === 0 ? "🔴 Today" : highlight.daysAgo === 1 ? "Yesterday" : `${highlight.daysAgo}d ago`;
  const freshnessColor = highlight.daysAgo === 0 ? "text-limeGreen" : "text-lightPurple/60";

  return (
    <div ref={ref} className="snap-start relative h-full w-full flex-shrink-0 bg-black overflow-hidden">
      <Image src={thumbUrl} alt={highlight.event} fill className="object-cover" unoptimized priority={index <= 1} />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

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
      {index === 0 && inView && (
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
    <div className="h-full w-full rounded-[22px] bg-purplePanel animate-pulse overflow-hidden relative">
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

  return (
    <>
      {activeVideo && <VideoPlayer highlight={activeVideo} onClose={() => setActiveVideo(null)} />}

      <div className="h-full w-full">
        {loading && <Skeleton />}

        {!loading && error && (
          <div className="flex h-full items-center justify-center rounded-[22px] border border-fontRed/20 bg-purplePanel p-6 text-sm text-lightPurple/70 text-center">
            Couldn&apos;t load highlights right now.
          </div>
        )}

        {!loading && !error && highlights.length === 0 && (
          <div className="flex h-full items-center justify-center rounded-[22px] border border-limeGreenOpacity/10 bg-purplePanel p-6 text-sm text-lightPurple/70 text-center">
            No highlight videos yet — check back after matches finish.
          </div>
        )}

        {!loading && !error && highlights.length > 0 && (
          <div
            className="h-full w-full overflow-y-auto snap-y snap-mandatory scrollbar-hide rounded-[22px]"
          >
            {highlights.map((h, i) => (
              <VideoSlide key={h.id} highlight={h} index={i} total={highlights.length} onPlay={() => setActiveVideo(h)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
