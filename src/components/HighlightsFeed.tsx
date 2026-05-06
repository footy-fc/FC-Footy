"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

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

// ── Slide — Auto-plays inline when in view ───────────────────────
function VideoSlide({ highlight, index, total }: {
  highlight: VideoHighlight; index: number; total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  const thumbUrl = `https://img.youtube.com/vi/${highlight.videoId}/maxresdefault.jpg`;
  const freshnessLabel = highlight.daysAgo === 0 ? "🔴 Today" : highlight.daysAgo === 1 ? "Yesterday" : `${highlight.daysAgo}d ago`;
  const freshnessColor = highlight.daysAgo === 0 ? "text-limeGreen" : "text-lightPurple/60";

  // autoplay=1 ensures it plays automatically when mounted.
  // controls=0 & mute=1 helps it autoplay on mobile browsers without interaction.
  const src = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${highlight.videoId}`;

  return (
    <div ref={ref} className="snap-start relative h-full w-full flex-shrink-0 bg-black overflow-hidden">
      {/* Show Thumbnail initially or if not in view to save resources */}
      <Image 
        src={thumbUrl} 
        alt={highlight.event} 
        fill 
        className={`object-cover transition-opacity duration-500 ${inView ? 'opacity-0' : 'opacity-100'}`} 
        unoptimized 
        priority={index <= 1} 
      />

      {/* When in view, mount the iframe. pointer-events-none ensures swipe isn't stolen by YouTube */}
      {inView && (
        <div className="absolute inset-0 pointer-events-none">
          <iframe 
            src={src} 
            title={highlight.event}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="absolute inset-0 w-full h-[120%] -top-[10%] border-0 object-cover" 
          />
        </div>
      )}

      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

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
              <VideoSlide key={h.id} highlight={h} index={i} total={highlights.length} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
