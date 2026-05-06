import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface VideoHighlight {
  id: string;
  event: string;
  league: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  videoId: string;
  publishedAt: string; // ISO string
  hoursAgo: number;
}

// ── YouTube channel sources ─────────────────────────────────────
// These are official league / club channels + quality highlight channels
const YT_CHANNELS = [
  { id: "UCpryVRk_VDudG8SHXgWcG0w", label: "Premier League" },
  { id: "UCTv-XvfzLX3i4IGWAm4sbmA", label: "LaLiga" },
  { id: "UC3CXMy61P5WQMLiDDJn8nNA", label: "UEFA Europa League" },
  { id: "UCobslxvMOCOobFmNMtTjBzg", label: "Bundesliga" }, // official Bundesliga English
  { id: "UCbWUEnTRHb3bRdrnovq8iuA", label: "Football Daily" },
];

// TheSportsDB as a secondary source
const SPORTSDB_KEY = "3";

// ── Helpers ──────────────────────────────────────────────────────
function hoursAgo(isoStr: string): number {
  return (Date.now() - new Date(isoStr).getTime()) / 3_600_000;
}

function makeYtUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function makeThumbnail(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ── YouTube RSS (no API key required) ───────────────────────────
async function fetchFromYouTubeChannel(
  channelId: string,
  label: string
): Promise<VideoHighlight[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];

    const xml = await res.text();

    // Simple regex-based XML parse (avoids DOMParser / node xml issues in edge/node)
    const videoIds = [...xml.matchAll(/<yt:videoId>(.*?)<\/yt:videoId>/g)].map(
      (m) => m[1]
    );
    const publishedDates = [...xml.matchAll(/<published>(.*?)<\/published>/g)].map(
      (m) => m[1]
    );
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)]
      .slice(1) // skip channel title
      .map((m) => m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

    const results: VideoHighlight[] = [];

    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      const publishedAt = publishedDates[i] ?? new Date().toISOString();
      const hrs = hoursAgo(publishedAt);
      if (hrs > 30) continue; // strictly within 30 hours

      results.push({
        id: `yt-${videoId}`,
        event: titles[i] ?? "Match Highlights",
        league: label,
        youtubeUrl: makeYtUrl(videoId),
        thumbnailUrl: makeThumbnail(videoId),
        videoId,
        publishedAt,
        hoursAgo: Math.round(hrs),
      });
    }

    return results;
  } catch {
    return [];
  }
}

// ── TheSportsDB (keeps legacy coverage for other leagues) ────────
interface SportsDbHighlight {
  idEvent?: string;
  strEvent?: string;
  strLeague?: string;
  strVideo?: string;
  strThumb?: string;
  strPoster?: string;
}

function extractYouTubeId(url: string): string {
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v) return v;
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    const parts = u.pathname.split("/");
    const idx = parts.indexOf("embed");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].split("?")[0];
  } catch { /* ignore */ }
  return "";
}

async function fetchFromSportsDB(dateStr: string): Promise<VideoHighlight[]> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/eventshighlights.php?d=${dateStr}&s=Soccer`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { tvhighlights?: SportsDbHighlight[] };
    return (data.tvhighlights ?? [])
      .filter((h) => h.strVideo?.includes("youtube"))
      .map((h) => {
        const videoId = extractYouTubeId(h.strVideo ?? "");
        const publishedAt = new Date().toISOString(); // no date from API
        return {
          id: h.idEvent ?? `sdb-${videoId}`,
          event: h.strEvent ?? "Match Highlights",
          league: h.strLeague ?? "Football",
          youtubeUrl: h.strVideo ?? "",
          thumbnailUrl: h.strThumb || h.strPoster || makeThumbnail(videoId),
          videoId,
          publishedAt,
          hoursAgo: 0,
        } as VideoHighlight;
      })
      .filter((h) => h.videoId);
  } catch {
    return [];
  }
}

// ── GET handler ──────────────────────────────────────────────────
export async function GET() {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString().split("T")[0];

    // Fetch all sources in parallel
    const [ytResults, sdbToday, sdbYesterday] = await Promise.all([
      Promise.all(
        YT_CHANNELS.map((ch) => fetchFromYouTubeChannel(ch.id, ch.label))
      ).then((all) => all.flat()),
      fetchFromSportsDB(today),
      fetchFromSportsDB(yesterday),
    ]);

    // Merge, deduplicate by videoId, sort newest first
    const seen = new Set<string>();
    const merged: VideoHighlight[] = [];

    for (const h of [...ytResults, ...sdbToday, ...sdbYesterday]) {
      if (!seen.has(h.videoId)) {
        seen.add(h.videoId);
        merged.push(h);
      }
    }

    // Sort: YouTube results are already within 30h; SportsDB approx 0
    merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json(merged.slice(0, 15), {
      headers: {
        "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[/api/highlights]", err);
    return NextResponse.json([], { status: 500 });
  }
}
