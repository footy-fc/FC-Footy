// @ts-nocheck
"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";
import ReactPlayer from "react-player";

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
  // @ts-ignore
  const playerRef = useRef<ReactPlayer>(null);
  const inView = useInView(ref);

  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  // Sync play state with inView
  useEffect(() => {
    if (inView) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [inView]);

  const handleTap = () => {
    setIsPlaying(prev => !prev);
    // Briefly show the play/pause icon
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!playerRef.current || duration === 0) return;
    
    // Calculate scrub position
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    // @ts-ignore
    playerRef.current.seekTo(percentage, 'fraction');
    setProgress(percentage);
  };

  const thumbUrl = `https://img.youtube.com/vi/${highlight.videoId}/maxresdefault.jpg`;
  const freshnessLabel = highlight.daysAgo === 0 ? "🔴 Today" : highlight.daysAgo === 1 ? "Yesterday" : `${highlight.daysAgo}d ago`;
  const freshnessColor = highlight.daysAgo === 0 ? "text-limeGreen" : "text-lightPurple/60";

  return (
    <div ref={ref} className="snap-start relative h-full w-full flex-shrink-0 bg-black overflow-hidden group">
      {/* Show Thumbnail initially or if not in view to save resources */}
      <Image 
        src={thumbUrl} 
        alt={highlight.event} 
        fill 
        className={`object-cover transition-opacity duration-500 ${inView ? 'opacity-0' : 'opacity-100'} pointer-events-none`} 
        unoptimized 
        priority={index <= 1} 
      />

      {/* When in view, mount the player. pointer-events-none ensures swipe isn't stolen by YouTube */}
      {inView && (
        <div className="absolute inset-0 pointer-events-none">
          {/* @ts-ignore */}
          <ReactPlayer
            ref={playerRef}
            url={`https://www.youtube.com/watch?v=${highlight.videoId}`}
            playing={isPlaying}
            muted={false} // Sound on by default as requested
            controls={false}
            width="100%"
            height="120%"
            style={{ position: 'absolute', top: '-10%', left: 0 }}
            playsinline
            loop
            onProgress={(state: any) => setProgress(state.played)}
            onDuration={(dur: number) => setDuration(dur)}
            config={{
              youtube: {
                playerVars: {
                  modestbranding: 1,
                  rel: 0,
                  disablekb: 1,
                }
              }
            } as any}
          />
        </div>
      )}

      {/* Tap Overlay - allows tapping to play/pause but lets touchmove pass through for swiping */}
      <div 
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleTap}
      >
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* Animated Play/Pause Icon */}
      <div className={`absolute inset-0 m-auto w-16 h-16 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center pointer-events-none transition-all duration-300 z-20 ${showPlayIcon ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}`}>
        {!isPlaying ? (
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white translate-x-0.5" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="absolute bottom-6 left-0 right-0 p-4 pointer-events-none z-20">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] font-black tracking-[0.18em] text-deepPink uppercase">{highlight.league}</p>
          <span className={`text-[10px] font-bold ${freshnessColor}`}>{freshnessLabel}</span>
        </div>
        <p className="text-[15px] font-bold text-white leading-snug line-clamp-2 pr-12">{highlight.event}</p>
      </div>

      {/* Scrub Bar (TikTok style at the very bottom) */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-4 z-30 group/scrub flex flex-col justify-end pb-1 cursor-pointer"
        onClick={handleSeek}
        onTouchMove={handleSeek}
      >
        <div className="w-full h-1 bg-white/20 group-hover/scrub:h-1.5 transition-all">
          <div 
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Counter */}
      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-bold text-white z-10 pointer-events-none">
        {index + 1}&thinsp;/&thinsp;{total}
      </div>

      {/* Swipe hint */}
      {index === 0 && inView && (
        <div className="absolute bottom-28 inset-x-0 flex flex-col items-center gap-1 pointer-events-none z-10">
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
              <VideoSlide 
                key={h.id} 
                highlight={h} 
                index={i} 
                total={highlights.length} 
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
