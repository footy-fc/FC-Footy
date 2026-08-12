"use client";

import React from "react";
import Image from "next/image";
import type { YouTubeChannelPayload, YouTubeChannelVideo } from "~/app/api/youtube-channel/route";

const CHANNEL_ID = "UCQn56wvJDa4ukd5n8XF5z_A";
const CHANNEL_DISPLAY_TITLE = "Final Whistle with Split & Peel";
const EMBED_FALLBACK_ORIGIN = "https://fc-footy.vercel.app";

function truncateDescription(description: string) {
  return description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function PlayIcon({ isPlaying }: { isPlaying: boolean }) {
  return isPlaying ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function YouTubeReel({
  video,
  active,
  embedOrigin,
  isPlaying,
  isMuted,
  showControls,
  setReelRef,
  setIframeRef,
  onFocus,
  onIframeLoad,
  onTogglePlay,
  onToggleMuted,
  onShowControls,
}: {
  video: YouTubeChannelVideo;
  active: boolean;
  embedOrigin: string;
  isPlaying: boolean;
  isMuted: boolean;
  showControls: boolean;
  setReelRef: (node: HTMLElement | null) => void;
  setIframeRef: (node: HTMLIFrameElement | null) => void;
  onFocus: () => void;
  onIframeLoad: () => void;
  onTogglePlay: () => void;
  onToggleMuted: () => void;
  onShowControls: () => void;
}) {
  const embedUrl = `https://www.youtube.com/embed/${video.id}?autoplay=1&mute=0&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(embedOrigin)}&cc_load_policy=0&iv_load_policy=3&disablekb=1&fs=0`;

  return (
    <article
      ref={setReelRef}
      data-video-id={video.id}
      className="flex min-h-full snap-start flex-col justify-start py-3"
    >
      <div
        className={`group relative overflow-hidden rounded-[18px] border bg-black transition-colors ${
          active ? "border-deepPink/60" : "border-white/10"
        }`}
        onPointerDown={() => {
          onFocus();
          onShowControls();
        }}
        onMouseEnter={onShowControls}
      >
        {active ? (
          <iframe
            ref={setIframeRef}
            key={video.id}
            src={embedUrl}
            title={video.title}
            className="pointer-events-none aspect-video w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={onIframeLoad}
          />
        ) : (
          <div className="relative aspect-video w-full">
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="360px"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/25" />
          </div>
        )}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200 ${
            active && showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 p-3 transition-opacity duration-200 ${
            active && showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFocus();
              onTogglePlay();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-notWhite text-darkPurple shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            <PlayIcon isPlaying={active && isPlaying} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFocus();
              onToggleMuted();
            }}
            className="rounded-full border border-white/15 bg-black/60 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-sm"
            aria-label={isMuted ? "Turn audio on" : "Mute video"}
          >
            {isMuted ? "Muted" : "Audio"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-deepPink">
          {video.publishedLabel}
        </div>
        <h3 className="text-lg font-semibold leading-6 text-notWhite">{video.title}</h3>
        {video.description ? (
          <p className="mt-2 text-sm leading-5 text-lightPurple">
            {truncateDescription(video.description)}
            {video.description.length > 280 ? "..." : ""}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function YouTubeChannelHome() {
  const [payload, setPayload] = React.useState<YouTubeChannelPayload | null>(null);
  const [activeVideoId, setActiveVideoId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playerReady, setPlayerReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [showControls, setShowControls] = React.useState(false);
  const playerIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const reelRefs = React.useRef(new Map<string, HTMLElement>());

  const postPlayerCommand = React.useCallback((func: string, args: unknown[] = []) => {
    playerIframeRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: "command",
      func,
      args,
    }), "*");
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/youtube-channel?channelId=${CHANNEL_ID}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to load channel");
        }

        const data = (await response.json()) as YouTubeChannelPayload;
        if (!cancelled) {
          setPayload(data);
          setActiveVideoId(data.videos[0]?.id || null);
        }
      } catch (loadError) {
        console.error("[YouTubeChannelHome] load failed", loadError);
        if (!cancelled) {
          setError("Could not load this YouTube channel.");
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

  const activeVideo = payload?.videos.find((video) => video.id === activeVideoId) || payload?.videos[0] || null;
  const embedOrigin = typeof window !== "undefined" ? window.location.origin : EMBED_FALLBACK_ORIGIN;

  React.useEffect(() => {
    if (!payload?.videos.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const focusedEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        const nextVideoId = focusedEntry?.target.getAttribute("data-video-id");

        if (nextVideoId) {
          setActiveVideoId((current) => (current === nextVideoId ? current : nextVideoId));
        }
      },
      {
        threshold: [0.55, 0.7, 0.85],
      },
    );

    reelRefs.current.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, [payload?.videos]);

  React.useEffect(() => {
    setPlayerReady(false);
    setIsPlaying(true);
    setShowControls(false);
  }, [activeVideo?.id]);

  React.useEffect(() => {
    if (!showControls || !isPlaying) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowControls(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [isPlaying, showControls]);

  React.useEffect(() => {
    if (!playerReady) {
      return;
    }

    if (isPlaying) {
      postPlayerCommand("playVideo");
    } else {
      postPlayerCommand("pauseVideo");
    }

    if (isMuted) {
      postPlayerCommand("mute");
    } else {
      postPlayerCommand("unMute");
    }

    postPlayerCommand("unloadModule", ["captions"]);
    postPlayerCommand("setOption", ["captions", "track", {}]);
  }, [isMuted, isPlaying, playerReady, postPlayerCommand]);

  const handleTogglePlay = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    setShowControls(true);
    postPlayerCommand(nextPlaying ? "playVideo" : "pauseVideo");
  };

  const handleToggleMuted = () => {
    setShowControls(true);
    setIsMuted((current) => !current);
  };

  if (loading) {
    return (
      <section className="rounded-[22px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
        <div className="mb-3 h-4 w-56 animate-pulse rounded-full bg-white/10" />
        <div className="aspect-video animate-pulse rounded-[18px] bg-darkPurple" />
      </section>
    );
  }

  if (error || !payload || !activeVideo || !payload.videos.length) {
    return (
      <section className="rounded-[22px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
        <div className="app-section-title mb-2">{CHANNEL_DISPLAY_TITLE}</div>
        <p className="text-sm">{error || "No videos are available for this channel."}</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-limeGreenOpacity bg-purplePanel text-lightPurple">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="app-section-title">{CHANNEL_DISPLAY_TITLE}</div>
        <div className="app-micro">Latest uploads from YouTube.</div>
      </div>

      <div className="h-[calc(100svh-260px)] overflow-y-auto overscroll-contain scroll-smooth snap-y snap-mandatory px-4 pb-4">
        {payload.videos.map((video) => (
          <YouTubeReel
            key={video.id}
            video={video}
            active={video.id === activeVideo?.id}
            embedOrigin={embedOrigin}
            isPlaying={isPlaying}
            isMuted={isMuted}
            showControls={showControls}
            setReelRef={(node) => {
              if (node) {
                reelRefs.current.set(video.id, node);
              } else {
                reelRefs.current.delete(video.id);
              }
            }}
            setIframeRef={(node) => {
              if (video.id === activeVideo?.id) {
                playerIframeRef.current = node;
              }
            }}
            onFocus={() => setActiveVideoId(video.id)}
            onIframeLoad={() => {
              setPlayerReady(true);
              playerIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
                "*",
              );
              postPlayerCommand("mute");
              postPlayerCommand("playVideo");
              postPlayerCommand("unloadModule", ["captions"]);
            }}
            onTogglePlay={handleTogglePlay}
            onToggleMuted={handleToggleMuted}
            onShowControls={() => setShowControls(true)}
          />
        ))}
      </div>
    </section>
  );
}
