import { NextRequest, NextResponse } from "next/server";

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";
const FPL_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; fc-footy/1.0)" };

function parseGameweek(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const gameweek = Number(value);
  return Number.isInteger(gameweek) && gameweek >= 1 && gameweek <= 38 ? gameweek : null;
}

export async function GET(request: NextRequest) {
  const gameweek = parseGameweek(new URL(request.url).searchParams.get("gameweek"));
  if (!gameweek) {
    return NextResponse.json({ error: "gameweek must be between 1 and 38" }, { status: 400 });
  }

  try {
    const [liveResponse, fixturesResponse] = await Promise.all([
      fetch(`${FPL_BASE_URL}/event/${gameweek}/live/`, { headers: FPL_HEADERS, next: { revalidate: 30 } }),
      fetch(`${FPL_BASE_URL}/fixtures/?event=${gameweek}`, { headers: FPL_HEADERS, next: { revalidate: 30 } }),
    ]);

    if (!liveResponse.ok || !fixturesResponse.ok) {
      return NextResponse.json(
        {
          error: "FPL live data is temporarily unavailable",
          liveStatus: liveResponse.status,
          fixturesStatus: fixturesResponse.status,
        },
        { status: 502 }
      );
    }

    const [live, fixtures] = await Promise.all([liveResponse.json(), fixturesResponse.json()]);
    return NextResponse.json(
      { gameweek, live, fixtures, fetched_at: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch live FPL data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
