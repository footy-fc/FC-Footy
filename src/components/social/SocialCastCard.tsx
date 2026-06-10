"use client";

import React from "react";
import { Goal, MessageCircle } from "lucide-react";
import BadgedProfileAvatar from "~/components/BadgedProfileAvatar";
import type { SocialFeedCast } from "~/components/social/types";
import { useFarcasterActions } from "~/lib/farcaster/actions";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

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
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"].some((suffix) => normalized.endsWith(suffix))) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return [
      "imagedelivery.net",
      "imagedelivery",
      "i.imgur.com",
      "images.ctfassets.net",
      "res.cloudinary.com",
      "cdn.discordapp.com",
      "media.discordapp.net",
      "pbs.twimg.com",
      "user-images.githubusercontent.com",
    ].some((host) => parsed.hostname.includes(host));
  } catch {
    return false;
  }
}

type ConversationNode = {
  cast?: {
    hash?: string;
    text?: string;
    timestamp?: string | number;
    author?: {
      fid?: number;
      username?: string;
      display_name?: string;
      pfp_url?: string;
    };
    embeds?: Array<{ url?: string }>;
    replies?: { count?: number };
    reactions?: { likes_count?: number; recasts_count?: number };
  };
  replies?: ConversationNode[];
};

type LinkPreviewData = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  site_name?: string;
  icon?: string;
  image_x?: number;
  image_y?: number;
};

function hostnameLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function extractUrlsFromText(text?: string) {
  if (!text) {
    return [];
  }

  const matches = text.match(/https?:\/\/[^\s]+/gi) || [];
  return matches.map((value) => value.replace(/[)\],.!?]+$/g, ""));
}

function uniqueUrls(urls: string[]) {
  const seen = new Set<string>();
  const normalized = urls
    .map((url) => url.trim())
    .filter(Boolean)
    .filter((url) => {
      if (seen.has(url)) {
        return false;
      }
      seen.add(url);
      return true;
    });
  return normalized;
}

function flattenConversationNodes(nodes: ConversationNode[], depth = 0): Array<ConversationNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenConversationNodes(node.replies || [], depth + 1),
  ]);
}

type SocialCastCardProps = {
  cast: SocialFeedCast;
  badgeLogoUrl?: string | null;
  badgeAlt?: string | null;
  actionHref?: string;
  actionLabel?: string;
  /** If false, like/recast buttons are hidden (e.g. read-only contexts) */
  allowReactions?: boolean;
  variant?: "default" | "channel";
};

export default function SocialCastCard({
  cast,
  badgeLogoUrl,
  badgeAlt,
  actionHref,
  actionLabel = "Open",
  allowReactions = true,
  variant = "default",
}: SocialCastCardProps) {
  const { toggleLike, toggleRecast, likedHashes, recastedHashes, isPending, error: reactionError } =
    useFarcasterActions();
  const { signCast, submitSignedMessage } = useFootyFarcaster();
  const [threadOpen, setThreadOpen] = React.useState(false);
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [threadError, setThreadError] = React.useState<string | null>(null);
  const [threadReplies, setThreadReplies] = React.useState<Array<ConversationNode & { depth: number }>>([]);
  const [replyText, setReplyText] = React.useState("");
  const [replyPending, setReplyPending] = React.useState(false);

  const normalizedHash = cast.hash?.startsWith("0x") ? cast.hash : `0x${cast.hash}`;
  const isLiked = likedHashes.has(normalizedHash);
  const isRecasted = recastedHashes.has(normalizedHash);
  const castAuthorFid = cast.author?.fid ?? 0;
  const authorName = cast.author?.display_name || cast.author?.username || "Footy supporter";
  const authorUsername = cast.author?.username;
  const embedUrls = uniqueUrls(
    (cast.embeds || [])
    .map((embed) => embed.url?.trim())
    .filter((url): url is string => Boolean(url))
  );
  const textUrls = uniqueUrls(extractUrlsFromText(cast.text));
  const imageEmbeds = embedUrls.filter(isImageUrl);
  const linkEmbeds = uniqueUrls([...embedUrls.filter((url) => !isImageUrl(url)), ...textUrls.filter((url) => !isImageUrl(url))]);
  const primaryLinkEmbed = linkEmbeds[0];
  const remainingLinkEmbeds = linkEmbeds.slice(1);
  const renderedText = React.useMemo(() => {
    const source = cast.text?.trim() || "No cast text recorded.";
    if (!primaryLinkEmbed) {
      return source;
    }

    const sanitized = source.replace(primaryLinkEmbed, "").replace(/\n{3,}/g, "\n\n").trim();
    return sanitized || source;
  }, [cast.text, primaryLinkEmbed]);
  const replyCount = statNumber(cast.replies?.count);
  const likeCount = statNumber(cast.reactions?.likes_count) + (isLiked ? 1 : 0);
  const [linkPreview, setLinkPreview] = React.useState<LinkPreviewData | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = React.useState(false);
  const loadConversation = React.useCallback(async () => {
    setThreadLoading(true);
    setThreadError(null);
    try {
      const response = await fetch(`/api/farcaster/conversation?hash=${encodeURIComponent(normalizedHash)}&reply_depth=2`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        conversation?: { replies?: ConversationNode[] };
        replies?: ConversationNode[];
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load conversation");
      }

      const nodes = payload.conversation?.replies || payload.replies || [];
      setThreadReplies(flattenConversationNodes(nodes));
      setThreadOpen(true);
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : "Failed to load conversation");
      setThreadOpen(true);
    } finally {
      setThreadLoading(false);
    }
  }, [normalizedHash]);

  const composeReply = React.useCallback(async () => {
    if (!replyText.trim() || replyPending) {
      return;
    }

    setReplyPending(true);
    try {
      if (!castAuthorFid || !normalizedHash) {
        throw new Error("Missing parent cast metadata");
      }

      const signedMessage = await signCast({
        text: replyText.trim(),
        parentCast: {
          fid: castAuthorFid,
          hash: normalizedHash as `0x${string}`,
        },
      });
      await submitSignedMessage(signedMessage);
      setReplyText("");
      setThreadOpen(false);
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : "Failed to compose reply");
    } finally {
      setReplyPending(false);
    }
  }, [castAuthorFid, normalizedHash, replyPending, replyText, signCast, submitSignedMessage]);

  React.useEffect(() => {
    if (!primaryLinkEmbed) {
      setLinkPreview(null);
      setLinkPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadPreview() {
      setLinkPreviewLoading(true);
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(primaryLinkEmbed)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          preview?: LinkPreviewData;
        };

        if (!response.ok || !payload.ok || !payload.preview) {
          if (!cancelled) {
            setLinkPreview(null);
          }
          return;
        }

        if (!cancelled) {
          setLinkPreview(payload.preview);
        }
      } catch {
        if (!cancelled) {
          setLinkPreview(null);
        }
      } finally {
        if (!cancelled) {
          setLinkPreviewLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [primaryLinkEmbed]);

  if (variant === "channel") {
    const hasMedia = imageEmbeds.length > 0;
    const openThread = () => {
      void loadConversation();
    };

    return (
      <article className="overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(23,19,34,0.98),rgba(11,12,24,0.98))] shadow-[0_20px_48px_rgba(0,0,0,0.26)]">
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <BadgedProfileAvatar
                pfpUrl={cast.author?.pfp_url}
                alt={authorUsername || "Profile"}
                badgeLogoUrl={badgeLogoUrl || undefined}
                badgeAlt={badgeAlt || undefined}
                sizeClassName="h-11 w-11"
                badgeSize={14}
                className="rounded-full border border-white/10 bg-darkPurple"
                fallbackClassName="text-lightPurple/80"
              />
              <div className="min-w-0">
                <h4 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-notWhite">{authorName}</h4>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#b6afcf]">
                  {authorUsername ? <span>@{authorUsername}</span> : null}
                  {authorUsername ? <span>•</span> : null}
                  <span>{formatTimestamp(cast.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>

          {hasMedia ? (
            <div className="mt-3 overflow-hidden rounded-[24px] border border-white/8 bg-black/15 p-2">
              <div className={`grid gap-2 ${imageEmbeds.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                <div className={`overflow-hidden rounded-[20px] ${imageEmbeds.length > 2 ? "col-span-2" : ""}`}>
                  <img
                    src={imageEmbeds[0]}
                    alt="Cast embed"
                    className="h-[224px] w-full object-cover"
                    loading="lazy"
                  />
                </div>
                {imageEmbeds.slice(1, 3).map((url) => (
                  <div key={url} className="overflow-hidden rounded-[18px]">
                    <img
                      src={url}
                      alt="Cast embed"
                      className="h-[132px] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-3">
            <p className="whitespace-pre-wrap text-[17px] leading-[1.55] tracking-[-0.01em] text-[#f0eafc]">
              {renderedText}
            </p>

            {primaryLinkEmbed && linkPreview ? (
              <a
                href={linkPreview.url || primaryLinkEmbed}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.04] transition-colors hover:bg-white/[0.06]"
              >
                {linkPreview.image ? (
                  <div className="overflow-hidden border-b border-white/8 bg-black/20">
                    <img
                      src={linkPreview.image}
                      alt={linkPreview.title || "Link preview"}
                      className="h-[152px] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="p-3">
                  <div className="flex items-center gap-2 text-[12px] text-[#9f97bb]">
                    {linkPreview.icon ? (
                      <img
                        src={linkPreview.icon}
                        alt=""
                        className="h-4 w-4 rounded-sm object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <span className="truncate">
                      {linkPreview.site_name?.trim() || hostnameLabel(linkPreview.url || primaryLinkEmbed)}
                    </span>
                  </div>
                  <div className="mt-1 text-[15px] font-semibold leading-[1.35] text-notWhite">
                    {linkPreview.title?.trim() || hostnameLabel(primaryLinkEmbed)}
                  </div>
                  {linkPreview.description?.trim() ? (
                    <p className="mt-1 line-clamp-2 text-[13px] leading-[1.45] text-[#b6afcf]">
                      {linkPreview.description.trim()}
                    </p>
                  ) : null}
                </div>
              </a>
            ) : null}

            {(remainingLinkEmbeds.length > 0 || (primaryLinkEmbed && !linkPreview && !linkPreviewLoading)) ? (
              <div className="mt-3 space-y-2">
                {(primaryLinkEmbed && !linkPreview ? [primaryLinkEmbed, ...remainingLinkEmbeds] : remainingLinkEmbeds)
                  .slice(0, 2)
                  .map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 overflow-hidden rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-[#c9c2de] transition-colors hover:border-limeGreenOpacity/20 hover:bg-white/[0.06]"
                  >
                    <span className="truncate">{url}</span>
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#ffb194]">Link</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {reactionError ? (
            <p className="mt-2 text-[11px] text-fontRed">{reactionError}</p>
          ) : null}

          <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-3">
            <button
              onClick={() => castAuthorFid > 0 && toggleLike(cast.hash, castAuthorFid)}
              disabled={isPending || castAuthorFid === 0}
              aria-label={isLiked ? "Unlike cast" : "Like cast"}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold transition-all duration-150 ${
                isLiked
                  ? "bg-[#7d203f] text-[#ffd0dc]"
                  : "bg-white/[0.04] text-[#d6d0e6] hover:bg-white/[0.07] hover:text-notWhite"
              } ${isPending ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <Goal className="h-4 w-4" strokeWidth={1.9} />
              <span>{likeCount}</span>
            </button>

            <button
              onClick={openThread}
              disabled={threadLoading}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold transition-all duration-150 ${
                threadOpen
                  ? "bg-[#2d2441] text-notWhite"
                  : "bg-white/[0.04] text-[#d6d0e6] hover:bg-white/[0.07] hover:text-notWhite"
              } ${threadLoading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.9} />
              <span>{threadOpen ? "Close banter" : "Banter"}</span>
            </button>
          </div>

          {threadOpen ? (
            <div className="mt-3 rounded-[22px] border border-white/8 bg-black/15 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[12px] font-semibold tracking-[0.08em] text-[#b6afcf]">Banter</div>
                <button
                  onClick={() => setThreadOpen(false)}
                  className="text-[11px] uppercase tracking-[0.14em] text-[#8f86ac] hover:text-[#c7c0db]"
                >
                  Close
                </button>
              </div>

              {threadError ? <p className="mb-3 text-xs text-fontRed">{threadError}</p> : null}

              <div className="space-y-3">
                {threadReplies.length === 0 && !threadLoading ? (
                  <div className="rounded-[16px] border border-dashed border-white/8 px-3 py-3 text-sm text-[#9f97bb]">
                    Fan banter helps fund the app.
                  </div>
                ) : null}

                {threadReplies.map((reply) => {
                  const replyCast = reply.cast;
                  const replyEmbeds = (replyCast?.embeds || [])
                    .map((embed) => embed.url?.trim())
                    .filter((url): url is string => Boolean(url));
                  const replyImages = replyEmbeds.filter(isImageUrl);
                  const indent = Math.min(reply.depth, 2) * 16;

                  return (
                    <div
                      key={`${replyCast?.hash || "reply"}-${reply.depth}`}
                      className="rounded-[18px] border border-white/6 bg-white/[0.03] p-2.5"
                      style={{ marginLeft: `${indent}px` }}
                    >
                      <div className="flex items-start gap-2.5">
                        <BadgedProfileAvatar
                          pfpUrl={replyCast?.author?.pfp_url}
                          alt={replyCast?.author?.username || "Reply"}
                          sizeClassName="h-8 w-8"
                          badgeSize={12}
                          className="rounded-full border border-white/8 bg-darkPurple"
                          fallbackClassName="text-lightPurple/80"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#9f97bb]">
                            <span className="font-semibold text-notWhite">
                              {replyCast?.author?.display_name || replyCast?.author?.username || "Supporter"}
                            </span>
                            {replyCast?.author?.username ? <span>@{replyCast.author.username}</span> : null}
                            <span>•</span>
                            <span>{formatTimestamp(typeof replyCast?.timestamp === "number" ? new Date(replyCast.timestamp).toISOString() : replyCast?.timestamp)}</span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-[1.5] text-[#e7e1f3]">
                            {replyCast?.text?.trim() || "No text"}
                          </p>
                          {replyImages.length > 0 ? (
                            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                              {replyImages.slice(0, 2).map((url) => (
                                <div key={url} className="overflow-hidden rounded-[16px] border border-white/10">
                                  <img src={url} alt="Reply embed" className="h-[160px] w-full object-cover" loading="lazy" />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3.5 flex flex-col gap-2">
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Fan banter here..."
                  rows={2}
                  className="w-full resize-none rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-notWhite outline-none placeholder:text-[#8f86ac] focus:border-limeGreenOpacity/25"
                />
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => void composeReply()}
                    disabled={!replyText.trim() || replyPending}
                    className="rounded-full border border-white/10 bg-[#251f36] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f4eefc] transition-colors hover:bg-[#2d2441] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {replyPending ? "Posting..." : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </article>
    );
  }

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
            <span>{replyCount}</span>
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
