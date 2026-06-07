"use client";

import React from "react";
import BadgedProfileAvatar from "~/components/BadgedProfileAvatar";
import type { SocialFeedCast } from "~/components/social/types";
import { useFarcasterActions } from "~/lib/farcaster/actions";

function formatTimestamp(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isImageUrl(url: string) {
  const normalized = url.split("?")[0]?.toLowerCase() || "";
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"].some((suffix) => normalized.endsWith(suffix));
}

type SocialCastCardProps = {
  cast: SocialFeedCast;
  badgeLogoUrl?: string | null;
  badgeAlt?: string | null;
  actionHref?: string;
  actionLabel?: string;
  /** If false, like/recast buttons are hidden (e.g. read-only contexts) */
  allowReactions?: boolean;
};

export default function SocialCastCard({
  cast,
  badgeLogoUrl,
  badgeAlt,
  actionHref,
  actionLabel = "Open",
  allowReactions = true,
}: SocialCastCardProps) {
  const { toggleLike, toggleRecast, likedHashes, recastedHashes, isPending, error: reactionError } =
    useFarcasterActions();

  const normalizedHash = cast.hash?.startsWith("0x") ? cast.hash : `0x${cast.hash}`;
  const isLiked = likedHashes.has(normalizedHash);
  const isRecasted = recastedHashes.has(normalizedHash);
  const castAuthorFid = cast.author?.fid ?? 0;
  const authorName = cast.author?.display_name || cast.author?.username || "Footy supporter";
  const authorUsername = cast.author?.username;
  const embedUrls = (cast.embeds || [])
    .map((embed) => embed.url?.trim())
    .filter((url): url is string => Boolean(url));
  const imageEmbeds = embedUrls.filter(isImageUrl);
  const linkEmbeds = embedUrls.filter((url) => !isImageUrl(url));

  return (
    <article className="overflow-hidden rounded-[24px] border border-limeGreenOpacity/15 bg-[linear-gradient(180deg,rgba(24,18,40,0.98),rgba(14,13,30,0.96))] shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,rgba(255,0,102,0.8),rgba(173,255,47,0.65),rgba(254,162,130,0.9))]" />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <BadgedProfileAvatar
              pfpUrl={cast.author?.pfp_url}
              alt={authorUsername || "Profile"}
              badgeLogoUrl={badgeLogoUrl || undefined}
              badgeAlt={badgeAlt || undefined}
              sizeClassName="h-11 w-11"
              badgeSize={14}
              className="rounded-full border border-limeGreenOpacity/20 bg-darkPurple"
              fallbackClassName="text-lightPurple"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-[15px] font-semibold text-notWhite">{authorName}</h4>
                <span className="rounded-full bg-darkPurple/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-lightPurple/70">
                  Cast
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-lightPurple/70">
                {authorUsername ? <span>@{authorUsername}</span> : null}
                {authorUsername ? <span>•</span> : null}
                <span>{formatTimestamp(cast.timestamp)}</span>
              </div>
            </div>
          </div>

          {actionHref ? (
            <a
              href={actionHref}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full border border-limeGreenOpacity/20 bg-darkPurple/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-notWhite transition-colors hover:border-limeGreenOpacity/40 hover:bg-darkPurple"
            >
              {actionLabel}
            </a>
          ) : null}
        </div>

        <div className="mt-4 rounded-[20px] bg-black/18 px-4 py-4">
          <p className="whitespace-pre-wrap text-[17px] leading-[1.55] text-[#ffb194]">
            {cast.text?.trim() || "No cast text recorded."}
          </p>

          {imageEmbeds.length > 0 ? (
            <div className={`mt-4 grid gap-3 ${imageEmbeds.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {imageEmbeds.slice(0, 4).map((url) => (
                <div
                  key={url}
                  className="overflow-hidden rounded-[18px] border border-lightPurple/10 bg-darkPurple/75 shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
                >
                  <img
                    src={url}
                    alt="Cast embed"
                    className="h-full max-h-[340px] w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {linkEmbeds.length > 0 ? (
            <div className="mt-4 space-y-2">
              {linkEmbeds.slice(0, 2).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 overflow-hidden rounded-[16px] border border-lightPurple/10 bg-darkPurple/70 px-3 py-3 text-sm text-lightPurple/85 transition-colors hover:border-limeGreenOpacity/30 hover:bg-darkPurple"
                >
                  <span className="truncate">{url}</span>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#fea282]">Link</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {/* Reaction error toast */}
        {reactionError ? (
          <p className="mt-2 text-[11px] text-fontRed">{reactionError}</p>
        ) : null}

        <div className="mt-4 flex items-center gap-1 border-t border-lightPurple/10 pt-3">
          {/* Replies — read-only */}
          <div className="flex items-center gap-1 px-2 py-1 text-xs text-lightPurple/60">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{statNumber(cast.replies?.count)}</span>
          </div>

          {/* Like button */}
          {allowReactions ? (
            <button
              onClick={() => castAuthorFid > 0 && toggleLike(cast.hash, castAuthorFid)}
              disabled={isPending || castAuthorFid === 0}
              aria-label={isLiked ? "Unlike cast" : "Like cast"}
              className={[
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-150",
                isLiked
                  ? "text-deepPink font-semibold"
                  : "text-lightPurple/60 hover:text-deepPink",
                isPending ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{statNumber(cast.reactions?.likes_count) + (isLiked ? 1 : 0)}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 text-xs text-lightPurple/60">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{statNumber(cast.reactions?.likes_count)}</span>
            </div>
          )}

          {/* Recast button */}
          {allowReactions ? (
            <button
              onClick={() => castAuthorFid > 0 && toggleRecast(cast.hash, castAuthorFid)}
              disabled={isPending || castAuthorFid === 0}
              aria-label={isRecasted ? "Remove recast" : "Recast"}
              className={[
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-150",
                isRecasted
                  ? "text-limeGreen font-semibold"
                  : "text-lightPurple/60 hover:text-limeGreen",
                isPending ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              <span>{statNumber(cast.reactions?.recasts_count) + (isRecasted ? 1 : 0)}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 text-xs text-lightPurple/60">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              <span>{statNumber(cast.reactions?.recasts_count)}</span>
            </div>
          )}

          {/* View on Warpcast — only shown when no actionHref already in the header */}
          <div className="ml-auto" />
        </div>
      </div>
    </article>
  );
}
