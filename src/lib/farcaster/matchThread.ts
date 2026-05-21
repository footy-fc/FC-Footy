import {
  fetchCastConversation,
  fetchParentUrlFeed,
  HypersnapConversationCast,
  HypersnapConversationNode,
} from '~/lib/hypersnap';
import { FOOTBALL_PARENT_URL } from '~/lib/farcaster/channels';
import { normalizeFarcasterMessageHash, normalizeFootyShareUrl } from '~/lib/farcaster/shareUrl';

const LOOKBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAGES = 30;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

export type MatchThreadParticipant = {
  fid: number;
  displayName: string;
  pfpUrl: string | null;
};

export type MatchThreadReply = {
  fid: number;
  displayName: string;
  pfpUrl: string | null;
  username?: string;
  text: string;
  timestamp?: string | number;
  hash: string;
};

export type MatchThreadLookupResult = {
  found: boolean;
  parentCast: { fid: number; hash: `0x${string}` } | null;
  replyParticipants: MatchThreadParticipant[];
  replyCount: number;
  directReplies: MatchThreadReply[];
  rootText: string | null;
};

export type MatchChannelCast = {
  fid: number;
  displayName: string;
  username?: string;
  text: string;
  timestamp?: string | number;
  hash: string;
};

function getEmbedUrls(cast: { embeds?: Array<{ url?: string }> }) {
  return (cast.embeds || [])
    .map((embed) => embed.url?.trim())
    .filter((value): value is string => Boolean(value));
}

function toTimestamp(value: string | number | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function getReplyParticipants(nodes: HypersnapConversationNode[] | undefined) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { replyParticipants: [], replyCount: 0 };
  }

  const seen = new Set<number>();
  const replyParticipants: MatchThreadParticipant[] = [];

  for (const node of nodes) {
    const author = node.cast.author;
    if (!author?.fid || seen.has(author.fid)) {
      continue;
    }

    seen.add(author.fid);
    replyParticipants.push({
      fid: author.fid,
      displayName: author.display_name || author.displayName || author.username || 'Footy fan',
      pfpUrl: author.pfp_url || null,
    });
  }

  return {
    replyParticipants,
    replyCount: seen.size,
  };
}

function getDirectReplyContext(replies: HypersnapConversationCast[] | undefined) {
  if (!Array.isArray(replies) || replies.length === 0) {
    return { replyParticipants: [], replyCount: 0, directReplies: [] };
  }

  const seen = new Set<number>();
  const replyParticipants: MatchThreadParticipant[] = [];
  const directReplies: MatchThreadReply[] = [];

  for (const reply of replies) {
    const author = reply.author;
    if (!author?.fid) {
      continue;
    }

    if (!seen.has(author.fid)) {
      seen.add(author.fid);
      replyParticipants.push({
        fid: author.fid,
        displayName: author.display_name || author.displayName || author.username || 'Footy fan',
        pfpUrl: author.pfp_url || null,
      });
    }

    directReplies.push({
      fid: author.fid,
      displayName: author.display_name || author.displayName || author.username || 'Footy fan',
      pfpUrl: author.pfp_url || null,
      username: author.username,
      text: reply.text || '',
      timestamp: reply.timestamp,
      hash: normalizeFarcasterMessageHash(reply.hash) || reply.hash,
    });
  }

  return {
    replyParticipants,
    replyCount: seen.size,
    directReplies,
  };
}

export async function lookupRecentMatchThread(
  shareUrl: string,
  limitParam?: number
): Promise<MatchThreadLookupResult> {
  const normalizedShareUrl = normalizeFootyShareUrl(shareUrl);
  const limit =
    Number.isFinite(limitParam) && (limitParam as number) > 0
      ? Math.min(limitParam as number, MAX_LIMIT)
      : DEFAULT_LIMIT;
  const cutoff = Date.now() - LOOKBACK_WINDOW_MS;

  let cursor: string | null | undefined;
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    const feed = await fetchParentUrlFeed([FOOTBALL_PARENT_URL], limit, cursor);
    const castsWithinWindow = feed.casts.filter((cast) => {
      const timestamp = toTimestamp(cast.timestamp);
      return timestamp === null || timestamp >= cutoff;
    });

    const match = castsWithinWindow.find((cast) =>
      getEmbedUrls(cast).some((embedUrl) => normalizeFootyShareUrl(embedUrl) === normalizedShareUrl)
    );

    const normalizedHash = normalizeFarcasterMessageHash(match?.hash);

    if (match && match.author?.fid && normalizedHash) {
      const conversation = await fetchCastConversation(normalizedHash, 'hash', 1).catch(() => null);
      const directReplies = conversation?.conversation?.cast?.direct_replies;
      const replyNodes = conversation?.conversation?.replies || conversation?.replies;
      const directReplyContext =
        Array.isArray(directReplies) && directReplies.length > 0
          ? getDirectReplyContext(directReplies)
          : null;
      const fallbackReplyContext = getReplyParticipants(replyNodes);

      return {
        found: true,
        parentCast: {
          fid: match.author.fid,
          hash: normalizedHash,
        },
        replyParticipants: directReplyContext?.replyParticipants ?? fallbackReplyContext.replyParticipants,
        replyCount: directReplyContext?.replyCount ?? fallbackReplyContext.replyCount,
        directReplies: directReplyContext?.directReplies ?? [],
        rootText: match.text || conversation?.conversation?.cast?.text || null,
      };
    }

    const oldestTimestamp = feed.casts.reduce<number | null>((oldest, cast) => {
      const timestamp = toTimestamp(cast.timestamp);
      if (timestamp === null) {
        return oldest;
      }

      return oldest === null ? timestamp : Math.min(oldest, timestamp);
    }, null);

    if (!feed.next?.cursor || feed.casts.length === 0 || (oldestTimestamp !== null && oldestTimestamp < cutoff)) {
      break;
    }

    cursor = feed.next.cursor;
    pageCount += 1;
  }

  return {
    found: false,
    parentCast: null,
    replyParticipants: [],
    replyCount: 0,
    directReplies: [],
    rootText: null,
  };
}

export async function fetchRecentMatchChannelCasts(
  shareUrl: string,
  limitParam?: number
): Promise<MatchChannelCast[]> {
  const normalizedShareUrl = normalizeFootyShareUrl(shareUrl);
  const limit =
    Number.isFinite(limitParam) && (limitParam as number) > 0
      ? Math.min(limitParam as number, MAX_LIMIT)
      : DEFAULT_LIMIT;
  const cutoff = Date.now() - LOOKBACK_WINDOW_MS;

  let cursor: string | null | undefined;
  let pageCount = 0;
  const seen = new Set<string>();
  const casts: MatchChannelCast[] = [];

  while (pageCount < MAX_PAGES) {
    const feed = await fetchParentUrlFeed([FOOTBALL_PARENT_URL], limit, cursor);
    const castsWithinWindow = feed.casts.filter((cast) => {
      const timestamp = toTimestamp(cast.timestamp);
      return timestamp === null || timestamp >= cutoff;
    });

    for (const cast of castsWithinWindow) {
      const normalizedHash = normalizeFarcasterMessageHash(cast.hash) || cast.hash;
      if (seen.has(normalizedHash)) {
        continue;
      }

      const matchesShareUrl = getEmbedUrls(cast).some(
        (embedUrl) => normalizeFootyShareUrl(embedUrl) === normalizedShareUrl
      );

      if (!matchesShareUrl || !cast.author?.fid) {
        continue;
      }

      seen.add(normalizedHash);
      casts.push({
        fid: cast.author.fid,
        displayName: cast.author.display_name || cast.author.displayName || cast.author.username || 'Footy fan',
        username: cast.author.username,
        text: cast.text || '',
        timestamp: cast.timestamp,
        hash: normalizedHash,
      });
    }

    const oldestTimestamp = feed.casts.reduce<number | null>((oldest, cast) => {
      const timestamp = toTimestamp(cast.timestamp);
      if (timestamp === null) {
        return oldest;
      }

      return oldest === null ? timestamp : Math.min(oldest, timestamp);
    }, null);

    if (!feed.next?.cursor || feed.casts.length === 0 || (oldestTimestamp !== null && oldestTimestamp < cutoff)) {
      break;
    }

    cursor = feed.next.cursor;
    pageCount += 1;
  }

  return casts;
}
