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

type YouTubeDataChannelResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
};

type YouTubeDataPlaylistItemsResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
      resourceId?: {
        videoId?: string;
      };
    };
    contentDetails?: {
      videoPublishedAt?: string;
    };
  }>;
};

const DEFAULT_CHANNEL_ID = "UCQn56wvJDa4ukd5n8XF5z_A";
const DEFAULT_CHANNEL_HANDLE = "@split-peel";
const DEFAULT_CHANNEL_TITLE = "Final Whistle with Split & Peel";
const CHANNEL_ID_RE = /^[A-Za-z0-9_-]{10,64}$/;
const MAX_VIDEOS = 12;
const YOUTUBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "application/rss+xml,text/xml,application/xml,text/html;q=0.9,*/*;q=0.8",
};

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

function getApiKey(): string {
  return process.env.YOUTUBE_API_KEY || process.env.GOOGLE_YOUTUBE_API_KEY || "";
}

function getDataApiUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  url.searchParams.set("key", getApiKey());
  return url.toString();
}

async function fetchWithRetries(url: string, attempts = 3): Promise<Response | null> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: YOUTUBE_HEADERS,
        signal: AbortSignal.timeout(7000),
      });

      if (response.ok) {
        return response;
      }

      console.warn(`[youtube-channel] ${url} returned ${response.status} on attempt ${attempt}`);
    } catch (error) {
      console.warn(`[youtube-channel] ${url} failed on attempt ${attempt}`, error);
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }

  return null;
}

function getBestThumbnail(thumbnails: Record<string, { url?: string }> | undefined, videoId: string): string {
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  );
}

async function fetchDataApiPayload(channelId: string): Promise<YouTubeChannelPayload | null> {
  if (!getApiKey()) {
    return null;
  }

  const channelResponse = await fetchWithRetries(
    getDataApiUrl("channels", {
      part: "snippet,contentDetails",
      id: channelId,
    }),
  );

  if (!channelResponse) {
    return null;
  }

  const channelJson = (await channelResponse.json()) as YouTubeDataChannelResponse;
  const channel = channelJson.items?.[0];
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    return null;
  }

  const playlistResponse = await fetchWithRetries(
    getDataApiUrl("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: String(MAX_VIDEOS),
    }),
  );

  if (!playlistResponse) {
    return null;
  }

  const playlistJson = (await playlistResponse.json()) as YouTubeDataPlaylistItemsResponse;
  const videos = (playlistJson.items || []).flatMap((item): YouTubeChannelVideo[] => {
    const snippet = item.snippet;
    const videoId = snippet?.resourceId?.videoId;
    const publishedAt = item.contentDetails?.videoPublishedAt || snippet?.publishedAt;
    const published = publishedAt ? new Date(publishedAt) : null;

    if (!videoId || !published || Number.isNaN(published.getTime())) {
      return [];
    }

    return [
      {
        id: videoId,
        title: snippet?.title || "Untitled video",
        description: snippet?.description || "",
        publishedAt: published.toISOString(),
        publishedAtMs: published.getTime(),
        publishedLabel: formatPublishedLabel(published),
        thumbnailUrl: getBestThumbnail(snippet?.thumbnails, videoId),
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      },
    ];
  }).sort((left, right) => right.publishedAtMs - left.publishedAtMs);

  return {
    channelId,
    channelTitle: channel?.snippet?.title || DEFAULT_CHANNEL_TITLE,
    videos,
  };
}

function parseFeedXml(xml: string, channelId: string): YouTubeChannelPayload {
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

  return {
    channelId,
    channelTitle: parsed.feed?.title || DEFAULT_CHANNEL_TITLE,
    videos,
  };
}

function parseVideosPage(html: string, channelId: string): YouTubeChannelPayload {
  const videos: YouTubeChannelVideo[] = [];
  const seen = new Set<string>();
  const videoPattern = /"videoId":"([A-Za-z0-9_-]{11})"[\s\S]{0,1200}?"title":\{"runs":\[\{"text":"([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = videoPattern.exec(html)) && videos.length < MAX_VIDEOS) {
    const [, videoId, rawTitle] = match;
    if (!videoId || !rawTitle || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);
    videos.push({
      id: videoId,
      title: rawTitle.replaceAll("\\u0026", "&"),
      description: "",
      publishedAt: new Date(0).toISOString(),
      publishedAtMs: 0,
      publishedLabel: "",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return {
    channelId,
    channelTitle: DEFAULT_CHANNEL_TITLE,
    videos,
  };
}

export async function GET(request: NextRequest) {
  const channelId = request.nextUrl.searchParams.get("channelId") || DEFAULT_CHANNEL_ID;

  if (!CHANNEL_ID_RE.test(channelId)) {
    return NextResponse.json({ error: "Invalid channelId" }, { status: 400 });
  }

  try {
    let payload = await fetchDataApiPayload(channelId);
    const rssResponse = payload?.videos.length
      ? null
      : await fetchWithRetries(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);

    if (rssResponse) {
      payload = parseFeedXml(await rssResponse.text(), channelId);
    }

    if (!payload?.videos.length && channelId === DEFAULT_CHANNEL_ID) {
      const pageResponse = await fetchWithRetries(`https://www.youtube.com/${DEFAULT_CHANNEL_HANDLE}/videos`, 2);
      if (pageResponse) {
        payload = parseVideosPage(await pageResponse.text(), channelId);
      }
    }

    return NextResponse.json(payload || { channelId, channelTitle: DEFAULT_CHANNEL_TITLE, videos: [] }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[/api/youtube-channel]", error);
    return NextResponse.json(
      { channelId, channelTitle: DEFAULT_CHANNEL_TITLE, videos: [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
