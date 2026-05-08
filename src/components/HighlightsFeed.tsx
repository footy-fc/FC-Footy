"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";
import { getTeamLogo } from "~/components/utils/fetchTeamLogos";
import { detectLeagueFromTeams, getTeamAbbreviation } from "~/components/utils/teamAbbreviations";

const ACTIVE_INDEX_KEY = "footy_highlights_active_index";
const MUTED_KEY = "footy_highlights_muted";

function readStoredNumber(key: string, fallback = 0): number {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function writeStoredNumber(key: string, value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(value));
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return fallback;
}

function writeStoredBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value ? "true" : "false");
}

function useInView(ref: React.RefObject<HTMLDivElement | null>, threshold = 0.8) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, { threshold });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}

function formatFreshnessLabel(daysAgo: number) {
  if (daysAgo === 0) {
    return "Today";
  }
  if (daysAgo === 1) {
    return "Yesterday";
  }
  return `${daysAgo}d ago`;
}

function buildShareText(highlight: VideoHighlight) {
  const matchup =
    highlight.homeTeam && highlight.awayTeam
      ? `${highlight.homeTeam} vs ${highlight.awayTeam}`
      : highlight.event;
  const scoreline = highlight.scoreline ? ` ${highlight.scoreline}` : "";

  return `${matchup}${scoreline} • ${highlight.league} • ${highlight.youtubeUrl}`;
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-[11px] text-white/80">
      <span className="font-semibold text-white/55">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function getLeagueCode(highlight: VideoHighlight): string {
  const leagueName = highlight.league.toLowerCase();

  if (highlight.homeTeam && highlight.awayTeam) {
    const detectedLeague = detectLeagueFromTeams(highlight.homeTeam, highlight.awayTeam, "eng");
    return detectedLeague.includes(".") ? detectedLeague : `${detectedLeague}.1`;
  }

  if (leagueName.includes("premier")) return "eng.1";
  if (leagueName.includes("laliga")) return "esp.1";
  if (leagueName.includes("major league")) return "usa.1";
  if (leagueName.includes("ligue 1")) return "fra.1";
  if (leagueName.includes("serie a")) return "ita.1";
  if (leagueName.includes("bundesliga")) return "ger.1";
  if (leagueName.includes("champions")) return "eng.1";

  return "eng.1";
}

function getTeamLogoUrl(teamName: string | null | undefined, highlight: VideoHighlight): string | null {
  if (!teamName) {
    return null;
  }

  const leagueCode = getLeagueCode(highlight);
  const abbreviation = getTeamAbbreviation(teamName).toLowerCase();
  const logoUrl = getTeamLogo(abbreviation, leagueCode);

  return logoUrl === "/defifa_spinner.gif" ? null : logoUrl;
}

function VideoSlide({
  highlight,
  index,
  total,
  autoplayMuted,
  onToggleMuted,
  onVisible,
}: {
  highlight: VideoHighlight;
  index: number;
  total: number;
  autoplayMuted: boolean;
  onToggleMuted: () => void;
  onVisible: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const inView = useInView(ref, 0.72);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const freshnessLabel = formatFreshnessLabel(highlight.daysAgo);
  const thumbUrl = highlight.thumbnailUrl || `https://img.youtube.com/vi/${highlight.videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&mute=${autoplayMuted ? 1 : 0}&controls=${controlsEnabled ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${highlight.videoId}&enablejsapi=1`;
  const homeLogoUrl = getTeamLogoUrl(highlight.homeTeam, highlight);
  const awayLogoUrl = getTeamLogoUrl(highlight.awayTeam, highlight);

  useEffect(() => {
    if (!inView) {
      setControlsEnabled(false);
      return;
    }

    onVisible(index);
  }, [highlight.videoId, inView, index, onVisible]);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame || !inView) {
      return;
    }

    const sendCommand = (func: string, args: unknown[] = []) => {
      frame.contentWindow?.postMessage(JSON.stringify({
        event: "command",
        func,
        args,
      }), "*");
    };

    sendCommand("playVideo");

    if (autoplayMuted) {
      sendCommand("mute");
    } else {
      sendCommand("unMute");
      sendCommand("setVolume", [100]);
    }
  }, [autoplayMuted, inView, highlight.videoId]);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActionMessage(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [actionMessage]);
  const handleShare = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const shareText = buildShareText(highlight);

    try {
      if (navigator.share) {
        await navigator.share({
          title: highlight.event,
          text: shareText,
          url: highlight.youtubeUrl,
        });
        setActionMessage("Shared");
        return;
      }

      await navigator.clipboard.writeText(highlight.youtubeUrl);
      setActionMessage("Link copied");
    } catch (error) {
      console.error("[HighlightsFeed] share failed", error);
      setActionMessage("Share failed");
    }
  }, [highlight]);

  const handleToggleControls = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setControlsEnabled((current) => !current);
  }, []);

  return (
    <div
      ref={ref}
      className="snap-start relative h-full w-full flex-shrink-0 overflow-hidden bg-black"
    >
      <Image
        src={thumbUrl}
        alt={highlight.event}
        fill
        className={`object-cover transition-opacity duration-500 pointer-events-none ${inView ? "opacity-0" : "opacity-100"}`}
        unoptimized
        priority={index <= 1}
      />

      {inView ? (
        <div className={`absolute inset-0 ${controlsEnabled ? "pointer-events-auto" : "pointer-events-none"}`} style={{ zIndex: 1 }}>
          <iframe
            ref={iframeRef}
            key={`${highlight.videoId}:${autoplayMuted ? "muted" : "sound"}`}
            src={embedUrl}
            title={highlight.event}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="absolute inset-0 h-[120%] w-full -top-[10%] border-0"
          />
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" style={{ zIndex: 2 }} />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3" style={{ zIndex: 5 }}>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            {index + 1}&thinsp;/&thinsp;{total}
          </div>
          {(homeLogoUrl || awayLogoUrl) ? (
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
              {homeLogoUrl ? (
                <Image
                  src={homeLogoUrl}
                  alt={highlight.homeTeam || "Home team"}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full bg-white object-contain"
                  unoptimized
                />
              ) : null}
              {awayLogoUrl ? (
                <Image
                  src={awayLogoUrl}
                  alt={highlight.awayTeam || "Away team"}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full bg-white object-contain"
                  unoptimized
                />
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleControls}
            className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-[11px] font-semibold backdrop-blur-sm ${controlsEnabled ? "bg-white text-black" : "bg-black/60 text-white"}`}
          >
            {controlsEnabled ? "Done" : "Controls"}
          </button>
          <button
            type="button"
            onClick={onToggleMuted}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
            aria-label={autoplayMuted ? "Unmute video" : "Mute video"}
          >
            {autoplayMuted ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18l2.45 2.45c.03-.2.05-.41.05-.63ZM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71ZM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19.73 20 21 18.73l-18-18ZM12 4 9.91 6.09 12 8.18V4Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4" style={{ zIndex: 4 }}>
        <div className="mb-3 flex items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-deepPink">
            {highlight.league}
          </p>
          <span className="text-[10px] font-bold text-limeGreen">{freshnessLabel}</span>
          <span className="ml-auto text-[10px] text-white/60">{highlight.publishedLabel}</span>
        </div>

        <p className="mb-2 text-[15px] font-bold leading-snug text-white line-clamp-2">
          {highlight.event}
        </p>

        <div className="mb-4 space-y-1">
          <MetaRow label="Score" value={highlight.scoreline} />
          <MetaRow label="Competition" value={highlight.league} />
          <MetaRow label="Source" value={highlight.sourceChannel} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center rounded-full border border-white/20 bg-black/50 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-sm"
          >
            Share
          </button>
          {actionMessage ? (
            <span className="text-[11px] text-white/75">{actionMessage}</span>
          ) : null}
        </div>
        {controlsEnabled ? (
          <div className="mt-2 text-[10px] text-white/55">
            YouTube controls unlocked for captions, volume, and settings.
          </div>
        ) : null}
      </div>
    </div>
  );
}

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

export default function HighlightsFeed() {
  const [highlights, setHighlights] = useState<VideoHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [hasPlaybackGesture, setHasPlaybackGesture] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasRestoredScrollRef = useRef(false);
  const effectiveMuted = hasPlaybackGesture ? muted : true;

  useEffect(() => {
    setActiveIndex(readStoredNumber(ACTIVE_INDEX_KEY, 0));
    setMuted(readStoredBoolean(MUTED_KEY, true));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch("/api/highlights");
        if (!res.ok) {
          throw new Error("Failed to load highlights");
        }

        const data = (await res.json()) as VideoHighlight[];
        if (!cancelled) {
          setHighlights(data);
          setError(data.length === 0);
        }
      } catch (fetchError) {
        console.error("[HighlightsFeed] load failed", fetchError);
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(false);

    void (async () => {
      try {
        const res = await fetch("/api/highlights", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load highlights");
        }

        const data = (await res.json()) as VideoHighlight[];
        setHighlights(data);
        setError(data.length === 0);
      } catch (fetchError) {
        console.error("[HighlightsFeed] retry failed", fetchError);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    writeStoredBoolean(MUTED_KEY, muted);
  }, [muted]);

  useEffect(() => {
    writeStoredNumber(ACTIVE_INDEX_KEY, activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    if (!highlights.length || hasRestoredScrollRef.current || !containerRef.current) {
      return;
    }

    const targetIndex = Math.min(activeIndex, highlights.length - 1);
    const targetNode = containerRef.current.children.item(targetIndex) as HTMLElement | null;
    if (!targetNode) {
      return;
    }

    hasRestoredScrollRef.current = true;
    window.requestAnimationFrame(() => {
      targetNode.scrollIntoView({ block: "start" });
    });
  }, [activeIndex, highlights.length]);

  useEffect(() => {
    if (!highlights.length) {
      return;
    }

    const upcoming = highlights.slice(activeIndex + 1, activeIndex + 3);
    for (const nextHighlight of upcoming) {
      const img = new window.Image();
      img.src = nextHighlight.thumbnailUrl;
    }
  }, [activeIndex, highlights]);

  const handleVisible = useCallback((index: number) => {
    setActiveIndex((current) => (current === index ? current : index));
  }, []);

  const handleToggleMuted = useCallback(() => {
    if (!hasPlaybackGesture) {
      setHasPlaybackGesture(true);
      setMuted(false);
      return;
    }

    setMuted((current) => !current);
  }, [hasPlaybackGesture]);

  return (
    <div className="h-full w-full">
      {loading && <Skeleton />}

      {!loading && error && (
        <div className="flex h-full items-center justify-center rounded-[22px] border border-fontRed/20 bg-purplePanel p-6 text-center text-sm text-lightPurple/70">
          <div className="space-y-3">
            <div>Highlights are temporarily unavailable.</div>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[11px] font-semibold text-white"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && highlights.length > 0 && (
        <div
          ref={containerRef}
          className="h-full w-full overflow-y-auto snap-y snap-mandatory scrollbar-hide rounded-[22px]"
          style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {highlights.map((highlight, index) => (
            <VideoSlide
              key={highlight.id}
              highlight={highlight}
              index={index}
              total={highlights.length}
              autoplayMuted={effectiveMuted}
              onToggleMuted={handleToggleMuted}
              onVisible={handleVisible}
            />
          ))}
        </div>
      )}
    </div>
  );
}
