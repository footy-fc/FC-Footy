"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { VideoHighlight } from "~/app/api/highlights/route";
import Image from "next/image";
import { getTeamLogo } from "~/components/utils/fetchTeamLogos";
import { detectLeagueFromTeams, getTeamAbbreviation } from "~/components/utils/teamAbbreviations";
import { BASE_URL } from "~/lib/config";

const ACTIVE_INDEX_KEY = "footy_highlights_active_index";
const MUTED_KEY = "footy_highlights_muted";
const VOLUME_KEY = "footy_highlights_volume";
const CAPTIONS_KEY = "footy_highlights_captions";

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

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getHighlightsShareUrl(highlight: VideoHighlight) {
  const appOrigin =
    BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://fc-footy.vercel.app");

  const url = new URL(appOrigin);
  url.searchParams.set("tab", "highlights");
  url.searchParams.set("highlight", highlight.videoId);
  return url.toString();
}

function buildShareText(highlight: VideoHighlight, shareUrl: string) {
  const matchup =
    highlight.homeTeam && highlight.awayTeam
      ? `${highlight.homeTeam} vs ${highlight.awayTeam}`
      : highlight.event;
  const scoreline = highlight.scoreline ? ` ${highlight.scoreline}` : "";

  return `${matchup}${scoreline} • ${highlight.league} • ${shareUrl}`;
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
  volume,
  captionsEnabled,
  onToggleMuted,
  onVolumeChange,
  onToggleCaptions,
  onVisible,
}: {
  highlight: VideoHighlight;
  index: number;
  total: number;
  autoplayMuted: boolean;
  volume: number;
  captionsEnabled: boolean;
  onToggleMuted: () => void;
  onVolumeChange: (nextVolume: number) => void;
  onToggleCaptions: () => void;
  onVisible: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const boostTimerRef = useRef<number | null>(null);
  const inView = useInView(ref, 0.72);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedBoostActive, setSpeedBoostActive] = useState(false);
  const [showChrome, setShowChrome] = useState(true);
  const [showExpandedControls, setShowExpandedControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const freshnessLabel = formatFreshnessLabel(highlight.daysAgo);
  const thumbUrl = highlight.thumbnailUrl || `https://img.youtube.com/vi/${highlight.videoId}/hqdefault.jpg`;
  const embedOrigin = typeof window !== "undefined" ? window.location.origin : "https://footy.club";
  const embedUrl = `https://www.youtube.com/embed/${highlight.videoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${highlight.videoId}&enablejsapi=1&origin=${encodeURIComponent(embedOrigin)}&cc_load_policy=1&cc_lang_pref=en`;
  const homeLogoUrl = getTeamLogoUrl(highlight.homeTeam, highlight);
  const awayLogoUrl = getTeamLogoUrl(highlight.awayTeam, highlight);
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const shareUrl = getHighlightsShareUrl(highlight);

  const postPlayerCommand = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: "command",
      func,
      args,
    }), "*");
  }, []);

  useEffect(() => {
    if (!inView) {
      setIsPlaying(false);
      setSpeedBoostActive(false);
      setShowChrome(false);
      setShowExpandedControls(false);
      return;
    }

    onVisible(index);
    setIsPlaying(true);
    setShowChrome(true);
  }, [highlight.videoId, inView, index, onVisible]);

  useEffect(() => {
    if (!iframeRef.current || !inView) {
      return;
    }

    postPlayerCommand(isPlaying ? "playVideo" : "pauseVideo");

    if (autoplayMuted) {
      postPlayerCommand("mute");
    } else {
      postPlayerCommand("unMute");
      postPlayerCommand("setVolume", [volume]);
    }

    postPlayerCommand("setPlaybackRate", [speedBoostActive ? 2 : 1]);
  }, [autoplayMuted, inView, isPlaying, postPlayerCommand, speedBoostActive, volume]);

  useEffect(() => {
    if (!inView) {
      return;
    }

    postPlayerCommand("loadModule", ["captions"]);
    if (captionsEnabled) {
      postPlayerCommand("setOption", ["captions", "track", { languageCode: "en" }]);
      postPlayerCommand("setOption", ["captions", "reload", true]);
    } else {
      postPlayerCommand("unloadModule", ["captions"]);
    }
  }, [captionsEnabled, inView, postPlayerCommand]);

  useEffect(() => {
    if (!inView) {
      return;
    }

    const poll = window.setInterval(() => {
      postPlayerCommand("getCurrentTime");
      postPlayerCommand("getDuration");
    }, 1000);

    return () => window.clearInterval(poll);
  }, [inView, postPlayerCommand]);

  useEffect(() => {
    if (!showChrome || showExpandedControls || !isPlaying) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowChrome(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [isPlaying, showChrome, showExpandedControls, currentTime]);

  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow || !inView) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeWindow) {
        return;
      }

      try {
        const payload = (typeof event.data === "string"
          ? JSON.parse(event.data)
          : event.data) as {
          event?: string;
          infoDelivery?: boolean;
          id?: string;
          info?: {
            currentTime?: number;
            duration?: number;
          };
        };

        const info = payload.info;
        if (!info) {
          return;
        }

        if (typeof info.currentTime === "number") {
          setCurrentTime(info.currentTime);
        }

        if (typeof info.duration === "number" && info.duration > 0) {
          setDuration(info.duration);
        }
      } catch {
        // Ignore non-JSON iframe messages.
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [highlight.videoId, inView]);

  useEffect(() => {
    const seedTimer = window.setTimeout(() => {
      postPlayerCommand("getDuration");
      postPlayerCommand("getCurrentTime");
    }, 500);

    return () => window.clearTimeout(seedTimer);
  }, [highlight.videoId, inView, postPlayerCommand]);

  useEffect(() => {
    return () => {
      if (boostTimerRef.current) {
        window.clearTimeout(boostTimerRef.current);
      }
    };
  }, []);

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
    const shareText = buildShareText(highlight, shareUrl);

    try {
      if (navigator.share) {
        await navigator.share({
          title: highlight.event,
          text: shareText,
          url: shareUrl,
        });
        setActionMessage("Shared");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setActionMessage("Link copied");
    } catch (error) {
      console.error("[HighlightsFeed] share failed", error);
      setActionMessage("Share failed");
    }
  }, [highlight, shareUrl]);

  const handleTogglePlay = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsPlaying((current) => !current);
  }, []);

  const clearBoost = useCallback(() => {
    if (boostTimerRef.current) {
      window.clearTimeout(boostTimerRef.current);
      boostTimerRef.current = null;
    }
    setSpeedBoostActive(false);
  }, []);

  const handleBoostStart = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (boostTimerRef.current) {
      window.clearTimeout(boostTimerRef.current);
    }
    boostTimerRef.current = window.setTimeout(() => {
      setSpeedBoostActive(true);
    }, 120);
  }, []);

  const handleBoostEnd = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    clearBoost();
  }, [clearBoost]);

  const handleVolumeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onVolumeChange(Number(e.target.value));
  }, [onVolumeChange]);

  const handleRevealChrome = useCallback(() => {
    setShowChrome(true);
  }, []);

  const handleToggleExpandedControls = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowChrome(true);
    setShowExpandedControls((current) => !current);
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const frame = iframeRef.current;
    if (!frame?.contentWindow || duration <= 0) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;

    frame.contentWindow.postMessage(JSON.stringify({
      event: "command",
      func: "seekTo",
      args: [nextTime, true],
    }), "*");

    setCurrentTime(nextTime);
    setShowChrome(true);
  }, [duration]);

  return (
    <div
      ref={ref}
      className="snap-start relative h-full w-full flex-shrink-0 overflow-hidden bg-black"
      onClick={handleRevealChrome}
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
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          <iframe
            ref={iframeRef}
            key={highlight.videoId}
            src={embedUrl}
            title={highlight.event}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="absolute inset-0 h-[120%] w-full -top-[10%] border-0"
          />
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" style={{ zIndex: 2 }} />

      <div className={`absolute inset-x-0 top-0 flex items-start justify-between p-3 transition-opacity duration-200 ${showChrome ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ zIndex: 5 }}>
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
            onClick={handleTogglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleExpandedControls}
            className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-[11px] font-semibold backdrop-blur-sm ${showExpandedControls ? "bg-white text-black" : "bg-black/60 text-white"}`}
          >
            {showExpandedControls ? "Hide" : "Tune"}
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4" style={{ zIndex: 4 }}>
        <div className={`mb-3 transition-all duration-200 ${showChrome ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 pointer-events-none"}`}>
          <button
            type="button"
            onClick={handleSeek}
            className="block w-full"
            aria-label="Seek video"
          >
            <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-white/80">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </button>
        </div>

        <div className={`mb-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/45 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-all duration-200 ${showExpandedControls && showChrome ? "max-h-44 p-3 opacity-100" : "max-h-0 px-3 opacity-0 pointer-events-none"}`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleCaptions}
              className={`inline-flex h-10 items-center justify-center rounded-full px-3 text-[11px] font-semibold transition-colors ${captionsEnabled ? "bg-white text-black" : "bg-white/8 text-white"}`}
            >
              CC
            </button>
            <button
              type="button"
              onClick={onToggleMuted}
              className={`inline-flex h-10 items-center justify-center rounded-full px-3 text-[11px] font-semibold transition-colors ${autoplayMuted ? "bg-white/8 text-white" : "bg-white text-black"}`}
            >
              {autoplayMuted ? "Muted" : "Audio"}
            </button>
            <button
              type="button"
              onPointerDown={handleBoostStart}
              onPointerUp={handleBoostEnd}
              onPointerLeave={handleBoostEnd}
              onPointerCancel={handleBoostEnd}
              className={`ml-auto inline-flex h-10 items-center justify-center rounded-full px-3 text-[11px] font-semibold transition-all ${speedBoostActive ? "bg-deepPink text-white shadow-[0_0_24px_rgba(189,25,93,0.45)]" : "bg-white/8 text-white"}`}
            >
              {speedBoostActive ? "2X" : "Hold 2X"}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-full bg-white/8 px-3 py-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white/80" fill="currentColor">
              {autoplayMuted || volume === 0 ? (
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18l2.45 2.45c.03-.2.05-.41.05-.63ZM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71ZM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19.73 20 21 18.73l-18-18ZM12 4 9.91 6.09 12 8.18V4Z" />
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              )}
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={autoplayMuted ? 0 : volume}
              onChange={handleVolumeInput}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
              aria-label="Volume"
            />
            <span className="w-8 text-right text-[10px] font-semibold text-white/70">{autoplayMuted ? 0 : volume}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-white/50">
            <span>{captionsEnabled ? "Captions on" : "Captions off"}</span>
            <span>{speedBoostActive ? "Speed boost live" : "Press and hold for 2x replay speed"}</span>
          </div>
        </div>

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
  const [volume, setVolume] = useState(72);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [hasPlaybackGesture, setHasPlaybackGesture] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasRestoredScrollRef = useRef(false);
  const effectiveMuted = hasPlaybackGesture ? muted : true;

  useEffect(() => {
    setActiveIndex(readStoredNumber(ACTIVE_INDEX_KEY, 0));
    setMuted(readStoredBoolean(MUTED_KEY, true));
    setVolume(readStoredNumber(VOLUME_KEY, 72));
    setCaptionsEnabled(readStoredBoolean(CAPTIONS_KEY, false));
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
    writeStoredNumber(VOLUME_KEY, volume);
  }, [volume]);

  useEffect(() => {
    writeStoredBoolean(CAPTIONS_KEY, captionsEnabled);
  }, [captionsEnabled]);

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

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setHasPlaybackGesture(true);
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
  }, []);

  const handleToggleCaptions = useCallback(() => {
    setCaptionsEnabled((current) => !current);
  }, []);

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
              volume={volume}
              captionsEnabled={captionsEnabled}
              onToggleMuted={handleToggleMuted}
              onVolumeChange={handleVolumeChange}
              onToggleCaptions={handleToggleCaptions}
              onVisible={handleVisible}
            />
          ))}
        </div>
      )}
    </div>
  );
}
