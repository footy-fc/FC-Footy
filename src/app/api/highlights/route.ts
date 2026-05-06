import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface VideoHighlight {
  id: string;
  event: string;
  league: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  videoId: string; // extracted YouTube video ID
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
    // youtube.com/watch?v=ID
    const v = u.searchParams.get("v");
    if (v) return v;
    // youtu.be/ID
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    // youtube.com/embed/ID
    const parts = u.pathname.split("/");
    const embedIdx = parts.indexOf("embed");
    if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];
  } catch {
    // ignore parse errors
  }
  return "";
}

async function fetchHighlightsForDate(dateStr: string): Promise<VideoHighlight[]> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventshighlights.php?d=${dateStr}&s=Soccer`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { tvhighlights?: SportsDbHighlight[] };
    const items = data.tvhighlights ?? [];

    return items
      .filter((h) => h.strVideo && h.strVideo.includes("youtube"))
      .map((h) => {
        const videoId = extractYouTubeId(h.strVideo ?? "");
        return {
          id: h.idEvent ?? `${dateStr}-${Math.random()}`,
          event: h.strEvent ?? "Match Highlights",
          league: h.strLeague ?? "Football",
          youtubeUrl: h.strVideo ?? "",
          thumbnailUrl:
            h.strThumb ||
            h.strPoster ||
            (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ""),
          videoId,
        };
      })
      .filter((h) => h.videoId); // must have a valid YouTube ID
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // Fetch last 5 days until we have at least 6 highlights
    const allHighlights: VideoHighlight[] = [];
    const seen = new Set<string>();

    for (let daysAgo = 0; daysAgo <= 5; daysAgo++) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split("T")[0];

      const dayHighlights = await fetchHighlightsForDate(dateStr);
      for (const h of dayHighlights) {
        if (!seen.has(h.videoId)) {
          seen.add(h.videoId);
          allHighlights.push(h);
        }
      }

      if (allHighlights.length >= 10) break;
    }

    return NextResponse.json(allHighlights.slice(0, 10), {
      headers: {
        "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[/api/highlights]", err);
    return NextResponse.json([], { status: 500 });
  }
}
