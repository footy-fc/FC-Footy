// @ts-nocheck
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";
import dynamic from "next/dynamic";

// Dynamically import ReactPlayer to avoid SSR issues (v3 has no sub-package exports)
const ReactPlayer = dynamic(() => import("react-player").then(m => ({ default: m.default })), { ssr: false });

// ── IntersectionObserver hook ────────────────────────────────────
function useInView(ref: React.RefObject<HTMLDivElement | null>, threshold = 0.7) {
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
  const playerRef = useRef<any>(null);
  const inView = useInView(ref);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true); // start muted for autoplay policy
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showIcon, setShowIcon] = useState(false);
  const [showMuteHint, setShowMuteHint] = useState(false);

  // Sync play state with inView — reset state when leaving view
  useEffect(() => {
    if (inView) {
      setIsPlaying(true);
      // Show mute hint briefly on first appear
      if (muted) {
        setShowMuteHint(true);
        const t = setTimeout(() => setShowMuteHint(false), 2500);
        return () => clearTimeout(t);
      }
    } else {
      setIsPlaying(false);
      setReady(false);
      setProgress(0);
    }
  }, [inView]);

  const handleTap = useCallback(() => {
    setIsPlaying(prev => !prev);
    setShowIcon(true);
    setTimeout(() => setShowIcon(false), 600);
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted(prev => !prev);
    setShowMuteHint(false);
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!playerRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    playerRef.current.seekTo(pct, "fraction");
    setProgress(pct);
  }, [duration]);

  const thumbUrl = `https://img.youtube.com/vi/${highlight.videoId}/hqdefault.jpg`;
  const freshnessLabel = highlight.daysAgo === 0 ? "🔴 Today" : highlight.daysAgo === 1 ? "Yesterday" : `${highlight.daysAgo}d ago`;
  const freshnessColor = highlight.daysAgo === 0 ? "text-limeGreen" : "text-lightPurple/60";

  return (
    <div
      ref={ref}
      className="snap-start relative flex-shrink-0 bg-black overflow-hidden group"
      style={{ height: "100%", width: "100%" }}
    >
      {/* Thumbnail — shown until player is ready */}
      <Image
        src={thumbUrl}
        alt={highlight.event}
        fill
        className={`object-cover transition-opacity duration-700 pointer-events-none ${ready && inView ? "opacity-0" : "opacity-100"}`}
        unoptimized
        priority={index <= 1}
      />

      {/* Player — only mount when in view */}
      {inView && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 1 }}
          // Note: NO pointer-events-none here — let the iframe breathe so it can initialise
          // We intercept taps via the overlay below instead
        >
          <ReactPlayer
            ref={playerRef}
            url={`https://www.youtube.com/watch?v=${highlight.videoId}`}
            playing={isPlaying}
            muted={muted}
            controls={false}
            width="100%"
            height="100%"
            playsinline
            loop
            onReady={() => setReady(true)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onProgress={(state: any) => setProgress(state.played)}
            onDuration={(dur: number) => setDuration(dur)}
            config={{
              youtube: {
                playerVars: {
                  modestbranding: 1,
                  rel: 0,
                  disablekb: 1,
                  playsinline: 1,
                  iv_load_policy: 3,
                  fs: 0,
                },
              },
            }}
            style={{ pointerEvents: "none" }} // prevent iframe from stealing swipe gestures
          />
        </div>
      )}

      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none"
        style={{ zIndex: 2 }}
      />

      {/* Tap overlay — sits above player, intercepts taps for play/pause */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ zIndex: 3 }}
        onClick={handleTap}
      />

      {/* Mute toggle button */}
      <button
        className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full text-white transition-opacity duration-300"
        style={{ zIndex: 10 }}
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          // Muted icon
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18l2.45 2.45c.03-.2.05-.41.05-.63ZM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71ZM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19.73 20 21 18.73l-18-18ZM12 4 9.91 6.09 12 8.18V4Z"/>
          </svg>
        ) : (
          // Unmuted icon
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>

      {/* Mute hint toast */}
      <div
        className={`absolute top-14 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none transition-all duration-500 ${showMuteHint ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
        style={{ zIndex: 10 }}
      >
        🔇 Tap 🔊 for sound
      </div>

      {/* Animated Play/Pause Icon */}
      <div
        className={`absolute inset-0 m-auto w-16 h-16 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center pointer-events-none transition-all duration-300`}
        style={{
          zIndex: 9,
          opacity: showIcon ? 1 : 0,
          transform: showIcon ? "scale(1)" : "scale(1.5)",
          position: "absolute",
          top: "50%",
          left: "50%",
          marginTop: "-32px",
          marginLeft: "-32px",
        }}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white translate-x-0.5" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="absolute bottom-6 left-0 right-0 p-4 pointer-events-none" style={{ zIndex: 4 }}>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] font-black tracking-[0.18em] text-deepPink uppercase">{highlight.league}</p>
          <span className={`text-[10px] font-bold ${freshnessColor}`}>{freshnessLabel}</span>
        </div>
        <p className="text-[15px] font-bold text-white leading-snug line-clamp-2 pr-12">{highlight.event}</p>
      </div>

      {/* Scrub Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-5 flex flex-col justify-end pb-1 cursor-pointer"
        style={{ zIndex: 10 }}
        onClick={handleSeek}
        onTouchMove={handleSeek}
      >
        <div className="w-full h-1 bg-white/20 hover:h-1.5 transition-all">
          <div
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Counter */}
      <div
        className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-bold text-white pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {index + 1}&thinsp;/&thinsp;{total}
      </div>

      {/* Swipe hint */}
      {index === 0 && inView && (
        <div className="absolute bottom-28 inset-x-0 flex flex-col items-center gap-1 pointer-events-none" style={{ zIndex: 4 }}>
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
          style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
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
  );
}
