"use client";

import React from "react";
import Image from "next/image";
import type { YouTubeChannelPayload, YouTubeChannelVideo } from "~/app/api/youtube-channel/route";

const CHANNEL_ID = "UCQn56wvJDa4ukd5n8XF5z_A";
const CHANNEL_DISPLAY_TITLE = "Final Whistle with Split & Peel";

function truncateDescription(description: string) {
  return description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function VideoRow({
  video,
  selected,
  onSelect,
}: {
  video: YouTubeChannelVideo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full grid-cols-[82px,1fr] gap-3 rounded-[18px] border p-2 text-left transition-colors ${
        selected
          ? "border-deepPink/55 bg-deepPink/15"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="relative aspect-video overflow-hidden rounded-[12px] bg-darkPurple">
        <Image
          src={video.thumbnailUrl}
          alt=""
          fill
          className="object-cover"
          sizes="82px"
          unoptimized
        />
      </div>
      <div className="min-w-0">
        <div className="line-clamp-2 text-xs font-semibold leading-4 text-notWhite">{video.title}</div>
        <div className="mt-1 text-[11px] font-medium text-lightPurple/70">{video.publishedLabel}</div>
      </div>
    </button>
  );
}

export default function YouTubeChannelHome() {
  const [payload, setPayload] = React.useState<YouTubeChannelPayload | null>(null);
  const [selectedVideoId, setSelectedVideoId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playerReady, setPlayerReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [showControls, setShowControls] = React.useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = React.useState(false);
  const [showPoster, setShowPoster] = React.useState(true);
  const playerIframeRef = React.useRef<HTMLIFrameElement | null>(null);

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
          setSelectedVideoId(data.videos[0]?.id || null);
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

  const selectedVideo = payload?.videos.find((video) => video.id === selectedVideoId) || payload?.videos[0] || null;
  const embedOrigin = typeof window !== "undefined" ? window.location.origin : "https://fc-footy.vercel.app";
  const embedUrl = selectedVideo
    ? `https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(embedOrigin)}`
    : null;

  React.useEffect(() => {
    setPlayerReady(false);
    setIsPlaying(true);
    setShowControls(false);
    setHasStartedPlayback(Boolean(selectedVideo?.id));
    setIsMuted(true);
    setShowPoster(true);
  }, [selectedVideo?.id]);

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

    const posterTimer = window.setTimeout(() => {
      setShowPoster(false);
    }, 850);

    return () => window.clearTimeout(posterTimer);
  }, [isMuted, isPlaying, playerReady, postPlayerCommand]);

  const handleTogglePlay = () => {
    if (!hasStartedPlayback) {
      setHasStartedPlayback(true);
      setIsPlaying(true);
      setShowControls(true);
      return;
    }

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

  if (error || !payload || !selectedVideo || !embedUrl) {
    return (
      <section className="rounded-[22px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
        <div className="app-section-title mb-2">{CHANNEL_DISPLAY_TITLE}</div>
        <p className="text-sm">{error || "No videos are available for this channel."}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
      <div className="mb-3">
        <div className="app-section-title">{CHANNEL_DISPLAY_TITLE}</div>
        <div className="app-micro">Latest uploads from YouTube.</div>
      </div>

      <div
        className="group relative overflow-hidden rounded-[18px] border border-white/10 bg-black"
        onClick={() => setShowControls(true)}
      >
        {hasStartedPlayback ? (
          <iframe
            ref={playerIframeRef}
            key={selectedVideo.id}
            src={embedUrl}
            title={selectedVideo.title}
            className="pointer-events-none aspect-video w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => {
              setPlayerReady(true);
              playerIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
                "*",
              );
            }}
          />
        ) : null}
        {showPoster ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleTogglePlay();
            }}
            className="absolute inset-0 z-10 block w-full overflow-hidden text-left"
            aria-label={`Play ${selectedVideo.title}`}
          >
            <Image
              src={selectedVideo.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="360px"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-black/10" />
          </button>
        ) : null}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200 ${
            showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 p-3 transition-opacity duration-200 ${
            showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleTogglePlay();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-notWhite text-darkPurple shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
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
            onClick={(event) => {
              event.stopPropagation();
              handleToggleMuted();
            }}
            className="rounded-full border border-white/15 bg-black/60 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-sm"
          >
            {isMuted ? "Muted" : "Audio"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-deepPink">
          {selectedVideo.publishedLabel}
        </div>
        <h3 className="text-lg font-semibold leading-6 text-notWhite">{selectedVideo.title}</h3>
        {selectedVideo.description ? (
          <p className="mt-2 text-sm leading-5 text-lightPurple">
            {truncateDescription(selectedVideo.description)}
            {selectedVideo.description.length > 280 ? "..." : ""}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {payload.videos.map((video) => (
          <VideoRow
            key={video.id}
            video={video}
            selected={video.id === selectedVideo.id}
            onSelect={() => setSelectedVideoId(video.id)}
          />
        ))}
      </div>
    </section>
  );
}
