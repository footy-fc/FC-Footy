import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type YouTubeChannelVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  publishedAtMs: number;
  publishedLabel: string;
  thumbnailUrl: string;
  youtubeUrl: string;
};

export type YouTubeChannelPayload = {
  channelId: string;
  channelTitle: string;
  videos: YouTubeChannelVideo[];
};

type FeedEntry = {
  title?: string;
  published?: string;
  "yt:videoId"?: string;
  "media:group"?: {
    "media:description"?: string;
    "media:thumbnail"?: { "@_url"?: string } | Array<{ "@_url"?: string }>;
  };
};

type ParsedFeed = {
  feed?: {
    title?: string;
    entry?: FeedEntry | FeedEntry[];
  };
};

const DEFAULT_CHANNEL_ID = "UCQn56wvJDa4ukd5n8XF5z_A";
const CHANNEL_ID_RE = /^[A-Za-z0-9_-]{10,64}$/;
const MAX_VIDEOS = 12;

function formatPublishedLabel(published: Date): string {
  return published.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getThumbnail(entry: FeedEntry, videoId: string): string {
  const thumbnail = entry["media:group"]?.["media:thumbnail"];
  const firstThumbnail = Array.isArray(thumbnail) ? thumbnail[0] : thumbnail;

  return firstThumbnail?.["@_url"] || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function normalizeEntries(entry: FeedEntry | FeedEntry[] | undefined): FeedEntry[] {
  if (!entry) {
    return [];
  }

  return Array.isArray(entry) ? entry : [entry];
}

export async function GET(request: NextRequest) {
  const channelId = request.nextUrl.searchParams.get("channelId") || DEFAULT_CHANNEL_ID;

  if (!CHANNEL_ID_RE.test(channelId)) {
    return NextResponse.json({ error: "Invalid channelId" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to load YouTube channel" }, { status: 502 });
    }

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xml) as ParsedFeed;
    const entries = normalizeEntries(parsed.feed?.entry);

    const videos = entries.flatMap((entry): YouTubeChannelVideo[] => {
      const videoId = entry["yt:videoId"];
      const published = entry.published ? new Date(entry.published) : null;

      if (!videoId || !published || Number.isNaN(published.getTime())) {
        return [];
      }

      return [
        {
          id: videoId,
          title: entry.title || "Untitled video",
          description: entry["media:group"]?.["media:description"] || "",
          publishedAt: published.toISOString(),
          publishedAtMs: published.getTime(),
          publishedLabel: formatPublishedLabel(published),
          thumbnailUrl: getThumbnail(entry, videoId),
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        },
      ];
    }).sort((left, right) => right.publishedAtMs - left.publishedAtMs).slice(0, MAX_VIDEOS);

    const payload: YouTubeChannelPayload = {
      channelId,
      channelTitle: parsed.feed?.title || "YouTube Channel",
      videos,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[/api/youtube-channel]", error);
    return NextResponse.json({ error: "Unable to load YouTube channel" }, { status: 500 });
  }
}
