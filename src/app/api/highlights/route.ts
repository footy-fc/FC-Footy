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
  { id: "UCSZbXT5TLLW_i-5W8FZpFsg", name: "MLS", league: "Major League Soccer" },
  { id: "UCWV3obpZVGgJ3j9FVhEjF2Q", name: "Real Madrid", league: "LaLiga" },
  { id: "UC14UlmYlSNiQCBe9Eookf_A", name: "FC Barcelona", league: "LaLiga" },
  { id: "UCkzCjdRMrW2vXLx8mvPVLdQ", name: "Man City", league: "Premier League" },
  { id: "UCpryVRk_VDudG8SHXgWcG0w", name: "Arsenal", league: "Premier League" },
  { id: "UC9LQwHZoucFT94I2h6JOcjw", name: "Liverpool", league: "Premier League" },
  { id: "UCt9a_qP9CqHCNwilf-iULag", name: "PSG", league: "Ligue 1" },
];

const CACHE_TTL_SECONDS = 60 * 10;
const STALE_TTL_SECONDS = 60 * 60 * 24;
const HIGHLIGHTS_LIMIT = 15;
const FRESH_CACHE_KEY = "fc-footy:highlights:fresh:v2";
const STALE_CACHE_KEY = "fc-footy:highlights:stale:v2";

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
    titleLower.includes(" vs ") ||
    titleLower.includes(" vs.") ||
    titleLower.includes(" v ") ||
    /\d+\s*[-:]\s*\d+/.test(titleLower)
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
        priority: highlightPriority(title),
      });
    }

    return highlights;
  } catch (error) {
    console.error(`[highlights] failed to fetch feed for ${channel.name}`, error);
    return [];
  }
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

  const finalHighlights = uniqueHighlights
    .slice(0, HIGHLIGHTS_LIMIT)
    .map(toExternalHighlight);

  return finalHighlights;
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
