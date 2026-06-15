import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { XMLParser } from "fast-xml-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface VideoHighlight {
  id: string;
  event: string;
  league: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  videoId: string;
  daysAgo: number;
  sourceChannel: string;
  publishedAt: string;
  publishedLabel: string;
  homeTeam?: string | null;
  awayTeam?: string | null;
  scoreline?: string | null;
}

type FeedChannel = {
  id: string;
  name: string;
  league: string;
  // Base score added to every video from this channel. Higher = surfaces sooner.
  // Used to favour reliable, embeddable sources (e.g. FIFA) over channels that
  // frequently disable embedding.
  basePriority?: number;
  // Flags channels whose content is World Cup focused so it can be boosted.
  isWorldCup?: boolean;
};

type CachedHighlightsEnvelope = {
  items: VideoHighlight[];
  fetchedAt: string;
  version: 1;
};

type FeedEntry = {
  title?: string;
  published?: string;
  "yt:videoId"?: string;
};

type ParsedFeed = {
  feed?: {
    entry?: FeedEntry | FeedEntry[];
  };
};

type InternalVideoHighlight = VideoHighlight & {
  publishedAtMs: number;
  priority: number;
};

const CHANNELS: FeedChannel[] = [
  // World Cup first. FIFA's official channel posts highlights for every match
  // and, thanks to the FIFA x YouTube partnership, those clips are built to be
  // watched on YouTube (i.e. embeddable), making them our most reliable source.
  {
    id: "UCpcTrCXblq78GZrTUTLWeBw",
    name: "FIFA",
    league: "FIFA World Cup",
    basePriority: 14,
    isWorldCup: true,
  },
  // Club channels as the supporting feed. MLS/EPL clubs generally allow embeds;
  // Spanish clubs disable embedding more often, so they get a lower base score.
  { id: "UCSZbXT5TLLW_i-5W8FZpFsg", name: "MLS", league: "Major League Soccer", basePriority: 3 },
  { id: "UCkzCjdRMrW2vXLx8mvPVLdQ", name: "Man City", league: "Premier League", basePriority: 3 },
  { id: "UCpryVRk_VDudG8SHXgWcG0w", name: "Arsenal", league: "Premier League", basePriority: 3 },
  { id: "UC9LQwHZoucFT94I2h6JOcjw", name: "Liverpool", league: "Premier League", basePriority: 3 },
  { id: "UCt9a_qP9CqHCNwilf-iULag", name: "PSG", league: "Ligue 1", basePriority: 2 },
  { id: "UCWV3obpZVGgJ3j9FVhEjF2Q", name: "Real Madrid", league: "LaLiga", basePriority: 1 },
  { id: "UC14UlmYlSNiQCBe9Eookf_A", name: "FC Barcelona", league: "LaLiga", basePriority: 1 },
];

const CACHE_TTL_SECONDS = 60 * 10;
const STALE_TTL_SECONDS = 60 * 60 * 24;
const HIGHLIGHTS_LIMIT = 18;
// Bumped to v4 after adding server-side embeddability filtering.
const FRESH_CACHE_KEY = "fc-footy:highlights:fresh:v4";
const STALE_CACHE_KEY = "fc-footy:highlights:stale:v4";

// Embeddability checks. We verify each candidate can actually play inline before
// serving it, so the feed only ever contains videos that won't hit the
// "can't play inline" fallback. Results are cached per video id.
const EMBED_CACHE_PREFIX = "fc-footy:highlights:embed:v1:";
const EMBED_OK_TTL_SECONDS = 60 * 60 * 24 * 7; // embeddable: trust for a week
const EMBED_BAD_TTL_SECONDS = 60 * 60 * 12; // non-embeddable: re-check sooner
const EMBED_CHECK_CONCURRENCY = 6;
const EMBED_CHECK_TIMEOUT_MS = 4500;
// Cap how many candidates we probe on a cold build so the request stays bounded.
const EMBED_CHECK_MAX_CANDIDATES = 60;

const redis =
  process.env.NEXT_PUBLIC_KV_REST_API_URL && process.env.NEXT_PUBLIC_KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
        token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
      })
    : null;

function calculateDaysAgo(published: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - published.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatPublishedLabel(published: Date): string {
  return published.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function normalizeTeamName(value: string): string {
  return value
    .replace(/\b(?:highlights?|extended highlights?|all goals?|goals?)\b/gi, "")
    .replace(/[|()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[-:–]+$/, "")
    .trim();
}

function parseMatchMetadata(title: string): Pick<VideoHighlight, "homeTeam" | "awayTeam" | "scoreline"> {
  const coreTitle = title.split("|")[0]?.trim() || title.trim();
  const scoreMatch = coreTitle.match(/(\d+)\s*[-:]\s*(\d+)/);

  if (scoreMatch) {
    const [rawScore, homeScore, awayScore] = scoreMatch;
    const [rawHome, rawAway] = coreTitle.split(rawScore);
    const homeTeam = normalizeTeamName(rawHome || "");
    const awayTeam = normalizeTeamName(rawAway || "");

    return {
      homeTeam: homeTeam || null,
      awayTeam: awayTeam || null,
      scoreline: `${homeScore}-${awayScore}`,
    };
  }

  const versusMatch = coreTitle.match(/(.+?)\s+(?:vs?\.?|v)\s+(.+)/i);
  if (versusMatch) {
    return {
      homeTeam: normalizeTeamName(versusMatch[1] || "") || null,
      awayTeam: normalizeTeamName(versusMatch[2] || "") || null,
      scoreline: null,
    };
  }

  return {
    homeTeam: null,
    awayTeam: null,
    scoreline: null,
  };
}

function isLikelyHighlight(title: string): boolean {
  const titleLower = title.toLowerCase();

  const isShort =
    titleLower.includes("#shorts") ||
    titleLower.includes(" short ") ||
    titleLower.startsWith("short") ||
    titleLower.includes("tiktok");

  if (isShort) {
    return false;
  }

  return (
    titleLower.includes("highlight") ||
    titleLower.includes("recap") ||
    titleLower.includes("goals") ||
    titleLower.includes("goal") ||
    titleLower.includes("world cup") ||
    titleLower.includes(" vs ") ||
    titleLower.includes(" vs.") ||
    titleLower.includes(" v ") ||
    /\d+\s*[-:]\s*\d+/.test(titleLower)
  );
}

function isWorldCupTitle(title: string): boolean {
  const titleLower = title.toLowerCase();
  return (
    titleLower.includes("world cup") ||
    titleLower.includes("fifa world cup") ||
    titleLower.includes("wc 2026") ||
    titleLower.includes("wc2026")
  );
}

function isLikelyBlockedOrNonPlayable(title: string): boolean {
  const titleLower = title.toLowerCase();

  if (
    titleLower.includes("live") ||
    titleLower.includes("build-up") ||
    titleLower.includes("build up") ||
    titleLower.includes("team news") ||
    titleLower.includes("reaction") ||
    titleLower.includes("training") ||
    titleLower.includes("press conference") ||
    titleLower.includes("full match") ||
    titleLower.includes("watchalong") ||
    titleLower.includes("stream")
  ) {
    return true;
  }

  const mentionsFutureFixtureDate =
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(title) &&
    /\b20\d{2}\b/.test(title);
  const explicitlyHighlightLike =
    titleLower.includes("highlight") ||
    titleLower.includes("recap") ||
    titleLower.includes("all goals") ||
    /\d+\s*[-:]\s*\d+/.test(titleLower);

  if (mentionsFutureFixtureDate && !explicitlyHighlightLike) {
    return true;
  }

  return false;
}

function highlightPriority(title: string): number {
  const titleLower = title.toLowerCase();
  let score = 0;

  if (titleLower.includes("extended highlights")) score += 8;
  if (titleLower.includes("highlights")) score += 6;
  if (titleLower.includes("highlight")) score += 5;
  if (titleLower.includes("recap")) score += 4;
  if (titleLower.includes("all goals")) score += 4;
  if (titleLower.includes("goals")) score += 3;
  if (/\d+\s*[-:]\s*\d+/.test(titleLower)) score += 3;
  if (titleLower.includes(" vs ") || titleLower.includes(" vs.") || titleLower.includes(" v ")) {
    score += 1;
  }

  // Float World Cup highlights to the top of the feed.
  if (isWorldCupTitle(title)) score += 12;

  return score;
}

function toExternalHighlight(item: InternalVideoHighlight): VideoHighlight {
  return {
    id: item.id,
    event: item.event,
    league: item.league,
    youtubeUrl: item.youtubeUrl,
    thumbnailUrl: item.thumbnailUrl,
    videoId: item.videoId,
    daysAgo: item.daysAgo,
    sourceChannel: item.sourceChannel,
    publishedAt: item.publishedAt,
    publishedLabel: item.publishedLabel,
    homeTeam: item.homeTeam,
    awayTeam: item.awayTeam,
    scoreline: item.scoreline,
  };
}

async function readCache(key: string): Promise<CachedHighlightsEnvelope | null> {
  if (!redis) {
    return null;
  }

  try {
    return (await redis.get<CachedHighlightsEnvelope>(key)) || null;
  } catch (error) {
    console.error(`[highlights] failed to read ${key}`, error);
    return null;
  }
}

async function writeCache(items: VideoHighlight[]): Promise<void> {
  if (!redis) {
    return;
  }

  const envelope: CachedHighlightsEnvelope = {
    items,
    fetchedAt: new Date().toISOString(),
    version: 1,
  };

  try {
    await Promise.all([
      redis.set(FRESH_CACHE_KEY, envelope, { ex: CACHE_TTL_SECONDS }),
      redis.set(STALE_CACHE_KEY, envelope, { ex: STALE_TTL_SECONDS }),
    ]);
  } catch (error) {
    console.error("[highlights] failed to write cache", error);
  }
}

async function fetchChannelFeed(channel: FeedChannel): Promise<InternalVideoHighlight[]> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`, {
      next: { revalidate: CACHE_TTL_SECONDS },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.error(`[highlights] feed request failed for ${channel.name}: ${res.status}`);
      return [];
    }

    const xmlData = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xmlData) as ParsedFeed;

    let entries = parsed.feed?.entry || [];
    if (!Array.isArray(entries)) {
      entries = [entries];
    }

    const highlights: InternalVideoHighlight[] = [];

    for (const entry of entries) {
      if (!entry) {
        continue;
      }

      const title = entry.title || "";
      const videoId = entry["yt:videoId"];
      const published = entry.published ? new Date(entry.published) : null;

      if (
        !videoId ||
        !published ||
        Number.isNaN(published.getTime()) ||
        !isLikelyHighlight(title) ||
        isLikelyBlockedOrNonPlayable(title)
      ) {
        continue;
      }

      const metadata = parseMatchMetadata(title);

      highlights.push({
        id: videoId,
        event: title,
        league: channel.league,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        videoId,
        daysAgo: calculateDaysAgo(published),
        sourceChannel: channel.name,
        publishedAt: published.toISOString(),
        publishedLabel: formatPublishedLabel(published),
        homeTeam: metadata.homeTeam,
        awayTeam: metadata.awayTeam,
        scoreline: metadata.scoreline,
        publishedAtMs: published.getTime(),
        priority:
          highlightPriority(title) +
          (channel.basePriority ?? 0) +
          (channel.isWorldCup ? 8 : 0),
      });
    }

    return highlights;
  } catch (error) {
    console.error(`[highlights] failed to fetch feed for ${channel.name}`, error);
    return [];
  }
}

/**
 * Determine whether a YouTube video can be embedded/played inline.
 *
 * YouTube's oEmbed endpoint is a reliable, key-free signal:
 *   - 200  -> embeddable
 *   - 401  -> the owner has disabled embedding
 *   - 404  -> private / deleted
 * We only ever EXCLUDE a video on an explicit "no" (401/404). Network errors or
 * timeouts return `true` so a transient hiccup never empties the feed.
 */
async function isVideoEmbeddable(videoId: string): Promise<boolean> {
  const cacheKey = `${EMBED_CACHE_PREFIX}${videoId}`;

  if (redis) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached === "1") return true;
      if (cached === "0") return false;
    } catch (error) {
      console.error("[highlights] embed cache read failed", error);
    }
  }

  let embeddable = true;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      { signal: AbortSignal.timeout(EMBED_CHECK_TIMEOUT_MS) },
    );

    if (res.status === 401 || res.status === 403 || res.status === 404) {
      embeddable = false;
    } else {
      embeddable = res.ok;
    }
  } catch (error) {
    // Treat transient failures as "keep" — don't over-filter on a network blip.
    console.error(`[highlights] embed check failed for ${videoId}`, error);
    return true;
  }

  if (redis) {
    try {
      await redis.set(cacheKey, embeddable ? "1" : "0", {
        ex: embeddable ? EMBED_OK_TTL_SECONDS : EMBED_BAD_TTL_SECONDS,
      });
    } catch (error) {
      console.error("[highlights] embed cache write failed", error);
    }
  }

  return embeddable;
}

/**
 * Walk the priority-sorted candidates and keep only embeddable ones, preserving
 * order, until we reach `limit`. Checks run in small concurrent batches.
 */
async function filterToEmbeddable(
  sorted: InternalVideoHighlight[],
  limit: number,
): Promise<InternalVideoHighlight[]> {
  const candidates = sorted.slice(0, EMBED_CHECK_MAX_CANDIDATES);
  const kept: InternalVideoHighlight[] = [];

  for (let i = 0; i < candidates.length && kept.length < limit; i += EMBED_CHECK_CONCURRENCY) {
    const batch = candidates.slice(i, i + EMBED_CHECK_CONCURRENCY);
    const results = await Promise.all(batch.map((item) => isVideoEmbeddable(item.videoId)));

    batch.forEach((item, idx) => {
      if (results[idx] && kept.length < limit) {
        kept.push(item);
      }
    });
  }

  return kept;
}

async function fetchFreshHighlights(): Promise<VideoHighlight[]> {
  const feeds = await Promise.all(CHANNELS.map((channel) => fetchChannelFeed(channel)));
  const allHighlights = feeds.flat();

  const seen = new Set<string>();
  const uniqueHighlights: InternalVideoHighlight[] = [];

  for (const highlight of allHighlights) {
    if (seen.has(highlight.videoId)) {
      continue;
    }

    seen.add(highlight.videoId);
    uniqueHighlights.push(highlight);
  }

  uniqueHighlights.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    return b.publishedAtMs - a.publishedAtMs;
  });

  // Keep only videos that will actually play inline.
  const embeddable = await filterToEmbeddable(uniqueHighlights, HIGHLIGHTS_LIMIT);

  // Safety net: if the embeddability checks somehow removed everything (e.g. the
  // oEmbed endpoint was unreachable for all of them), fall back to the top
  // candidates so the feed is never empty.
  const finalInternal = embeddable.length > 0
    ? embeddable
    : uniqueHighlights.slice(0, HIGHLIGHTS_LIMIT);

  return finalInternal.map(toExternalHighlight);
}

async function refreshHighlightsCache(): Promise<VideoHighlight[]> {
  const highlights = await fetchFreshHighlights();
  await writeCache(highlights);
  return highlights;
}

function jsonResponse(items: VideoHighlight[], cacheState: "live" | "fresh" | "stale") {
  return NextResponse.json(items, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
      "X-Highlights-Cache": cacheState,
    },
  });
}

export async function GET() {
  const freshCache = await readCache(FRESH_CACHE_KEY);
  if (freshCache?.items?.length) {
    return jsonResponse(freshCache.items, "fresh");
  }

  const staleCache = await readCache(STALE_CACHE_KEY);
  if (staleCache?.items?.length) {
    void refreshHighlightsCache().catch((error) => {
      console.error("[highlights] background refresh failed", error);
    });

    return jsonResponse(staleCache.items, "stale");
  }

  try {
    const freshHighlights = await refreshHighlightsCache();
    if (freshHighlights.length > 0) {
      return jsonResponse(freshHighlights, "live");
    }

    return NextResponse.json([], {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        "X-Highlights-Cache": "empty",
      },
    });
  } catch (error) {
    console.error("[/api/highlights]", error);
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        "X-Highlights-Cache": "error",
      },
    });
  }
}
