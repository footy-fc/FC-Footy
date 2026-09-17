import { NextRequest, NextResponse } from "next/server";

const BASE = "https://site.web.api.espn.com/apis/site/v2/sports/soccer";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const league = params.get("league")?.trim();
  const event = params.get("event")?.trim();
  if (!league || !event || !/^[a-z0-9._-]+$/i.test(league) || !/^\d+$/.test(event)) {
    return NextResponse.json({ error: "league and numeric event are required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${BASE}/${league}/summary?event=${event}`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return NextResponse.json({ error: "Lineups unavailable" }, { status: response.status });
    const data = await response.json();
    return NextResponse.json({ rosters: data.rosters ?? [] }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Lineups unavailable" }, { status: 502 });
  }
}
