"use client";

import React from "react";
import BadgedProfileAvatar from "~/components/BadgedProfileAvatar";
import type { SocialFeedCast } from "~/components/social/types";

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
};

export default function SocialCastCard({
  cast,
  badgeLogoUrl,
  badgeAlt,
  actionHref,
  actionLabel = "Open",
}: SocialCastCardProps) {
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

        <div className="mt-4 flex items-center gap-4 border-t border-lightPurple/10 pt-3 text-xs text-lightPurple/70">
          <span>{statNumber(cast.replies?.count)} replies</span>
          <span>{statNumber(cast.reactions?.likes_count)} likes</span>
          <span>{statNumber(cast.reactions?.recasts_count)} recasts</span>
        </div>
      </div>
    </article>
  );
}
