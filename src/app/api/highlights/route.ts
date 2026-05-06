import { NextResponse } from "next/server";
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
  daysAgo: number; // 0 = today, 1 = yesterday, etc.
  publishedAt?: number; // Used for precise sorting
}

const CHANNELS = [
  { id: "UCSZbXT5TLLW_i-5W8FZpFsg", name: "MLS", league: "Major League Soccer" },
  { id: "UCWV3obpZVGgJ3j9FVhEjF2Q", name: "Real Madrid", league: "LaLiga" },
  { id: "UC14UlmYlSNiQCBe9Eookf_A", name: "FC Barcelona", league: "LaLiga" },
  { id: "UCkzCjdRMrW2vXLx8mvPVLdQ", name: "Man City", league: "Premier League" },
  { id: "UCpryVRk_VDudG8SHXgWcG0w", name: "Arsenal", league: "Premier League" },
  { id: "UC9LQwHZoucFT94I2h6JOcjw", name: "Liverpool", league: "Premier League" },
  { id: "UCt9a_qP9CqHCNwilf-iULag", name: "PSG", league: "Ligue 1" },
];

function calculateDaysAgo(published: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - published.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

async function fetchChannelFeed(channel: typeof CHANNELS[0]): Promise<VideoHighlight[]> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const xmlData = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xmlData);

    let entries = parsed.feed?.entry || [];
    if (!Array.isArray(entries)) entries = [entries];

    const highlights: VideoHighlight[] = [];

    for (const entry of entries) {
      if (!entry) continue;
      
      const title = entry.title || "";
      const videoId = entry["yt:videoId"];
      const published = new Date(entry.published);

      const titleLower = title.toLowerCase();
      
      // Filter out shorts and non-match stuff, prioritize actual highlights & goals
      const isShort = titleLower.includes("#shorts") || titleLower.includes("short") || titleLower.includes("tiktok");
      const isHighlight = titleLower.includes("highlight") || 
                          titleLower.includes("goals") || 
                          titleLower.includes("goal") || 
                          titleLower.includes(" vs ") || 
                          titleLower.includes(" vs.") ||
                          titleLower.includes(" v ") ||
                          titleLower.includes("movie") ||
                          titleLower.includes("inside") ||
                          titleLower.includes("-");

      if (isHighlight && !isShort && videoId) {
        highlights.push({
          id: videoId,
          event: title,
          league: channel.league,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          videoId: videoId,
          daysAgo: calculateDaysAgo(published),
          publishedAt: published.getTime(),
        });
      }
    }

    return highlights;
  } catch (error) {
    console.error(`Failed to fetch feed for ${channel.name}`, error);
    return [];
  }
}

export async function GET() {
  try {
    const feeds = await Promise.all(CHANNELS.map(channel => fetchChannelFeed(channel)));
    
    // Flatten and deduplicate
    const allHighlights = feeds.flat();
    const seen = new Set<string>();
    const uniqueHighlights: VideoHighlight[] = [];

    for (const h of allHighlights) {
      if (!seen.has(h.videoId)) {
        seen.add(h.videoId);
        uniqueHighlights.push(h);
      }
    }

    // Sort globally by precise timestamp (newest first)
    uniqueHighlights.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

    // Remove publishedAt to save bandwidth
    const finalHighlights = uniqueHighlights.slice(0, 15).map(h => {
      const { publishedAt, ...rest } = h;
      return rest;
    });

    return NextResponse.json(finalHighlights, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    console.error("[/api/highlights]", err);
    return NextResponse.json([], { status: 500 });
  }
}
