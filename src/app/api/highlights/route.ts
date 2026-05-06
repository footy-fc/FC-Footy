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
  daysAgo: number; // 0 = today, 1 = yesterday, etc.
}

interface SportsDbHighlight {
  idEvent?: string;
  strEvent?: string;
  strLeague?: string;
  strSport?: string;
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
    const embedIdx = parts.indexOf("embed");
    if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1].split("?")[0];
  } catch { /* ignore */ }
  return "";
}

function toDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

async function fetchHighlightsForDate(
  dateStr: string,
  daysAgo: number
): Promise<VideoHighlight[]> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventshighlights.php?d=${dateStr}&s=Soccer`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { tvhighlights?: SportsDbHighlight[] };
    const items = data.tvhighlights ?? [];

    return items
      .filter((h) => h.strVideo?.includes("youtube"))
      .map((h) => {
        const videoId = extractYouTubeId(h.strVideo ?? "");
        return {
          id: h.idEvent ?? `${dateStr}-${videoId}`,
          event: h.strEvent ?? "Match Highlights",
          league: h.strLeague ?? "Football",
          youtubeUrl: h.strVideo ?? "",
          thumbnailUrl:
            h.strThumb ||
            h.strPoster ||
            (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ""),
          videoId,
          daysAgo,
        };
      })
      .filter((h) => h.videoId);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const seen = new Set<string>();
    const allHighlights: VideoHighlight[] = [];

    // Fetch the last 30 hours = today (0), yesterday (1), day-before-yesterday (2)
    // Run all 3 in parallel for speed, then sort today-first
    const [day0, day1, day2] = await Promise.all([
      fetchHighlightsForDate(toDateStr(0), 0),
      fetchHighlightsForDate(toDateStr(1), 1),
      fetchHighlightsForDate(toDateStr(2), 2),
    ]);

    // Merge in recency order (most recent first)
    for (const h of [...day0, ...day1, ...day2]) {
      if (!seen.has(h.videoId)) {
        seen.add(h.videoId);
        allHighlights.push(h);
      }
    }

    // If still thin, extend one more day
    if (allHighlights.length < 5) {
      const day3 = await fetchHighlightsForDate(toDateStr(3), 3);
      for (const h of day3) {
        if (!seen.has(h.videoId)) {
          seen.add(h.videoId);
          allHighlights.push(h);
        }
      }
    }

    return NextResponse.json(allHighlights.slice(0, 15), {
      headers: {
        // Cache for 15 minutes — new highlights typically appear within 2-4 hrs of FT
        "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[/api/highlights]", err);
    return NextResponse.json([], { status: 500 });
  }
}
