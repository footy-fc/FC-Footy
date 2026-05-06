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
  { id: "UC4i_9WvfPRTuRWEaWyfKuFw", name: "TNT Sports", league: "Champions League / Premier League" },
  { id: "UCNAf1k0yIjyGu3k9BwAg3lg", name: "Sky Sports Football", league: "Premier League / EFL" },
  { id: "UCX_tjI6Q_4JD1E3234CwemA", name: "CBS Sports Golazo", league: "Champions League / Serie A" },
  { id: "UC0YatYmg5JRYzXJPxIdRd8g", name: "beIN SPORTS", league: "LaLiga / Ligue 1 / Copa Libertadores" },
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
      signal: AbortSignal.timeout(8000),
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

      // Filter out likely shorts and non-match content
      // Focus on titles with keywords typical of match highlights
      const titleLower = title.toLowerCase();
      const isHighlight = titleLower.includes("highlights") || 
                          titleLower.includes("goals") || 
                          titleLower.includes("goal") || 
                          titleLower.includes(" vs ") || 
                          titleLower.includes(" vs.") ||
                          titleLower.includes(" v ") ||
                          titleLower.includes("-");
                          
      const isShort = titleLower.includes("#shorts") || titleLower.includes("short") || titleLower.includes("tiktok");

      if (isHighlight && !isShort && videoId) {
        highlights.push({
          id: videoId,
          event: title,
          league: channel.league,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
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
    // Fetch all channel feeds concurrently
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
    const finalHighlights = uniqueHighlights.slice(0, 40).map(h => {
      const { publishedAt, ...rest } = h;
      return rest;
    });

    return NextResponse.json(finalHighlights, {
      headers: {
        "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[/api/highlights]", err);
    return NextResponse.json([], { status: 500 });
  }
}
