import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = url.searchParams.get("ids")?.split(",").map(Number).filter(Number.isInteger) ?? [];
  const names = url.searchParams.get("names")?.split("|").filter(Boolean) ?? [];
  if (ids.length === 0 && names.length === 0) return NextResponse.json({ points: {} });
  try {
    const headers = { "User-Agent": "FC-Footy/1.0" };
    const bootstrapResponse = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", { headers, next: { revalidate: 300 } });
    if (!bootstrapResponse.ok) throw new Error("FPL bootstrap unavailable");
    const bootstrap = await bootstrapResponse.json() as { events: Array<{ id: number; is_current?: boolean; finished?: boolean }>; elements: Array<{ id: number; web_name?: string; first_name?: string; second_name?: string }> };
    const gameweek = bootstrap.events.find((event) => event.is_current)?.id ?? bootstrap.events.filter((event) => event.finished).at(-1)?.id;
    if (!gameweek) return NextResponse.json({ points: {} });
    const liveResponse = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`, { headers, next: { revalidate: 20 } });
    if (!liveResponse.ok) throw new Error("FPL live data unavailable");
    const live = await liveResponse.json() as { elements: Array<{ id: number; stats?: { total_points?: number } }> };
    const wanted = new Set(ids);
    const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const wantedNames = new Set(names.map(clean));
    const playerIds = new Set(bootstrap.elements.filter((element) => wanted.has(element.id) || [element.web_name, `${element.first_name ?? ""}${element.second_name ?? ""}`].some((name) => name && wantedNames.has(clean(name)))).map((element) => element.id));
    const points = Object.fromEntries(live.elements.filter((element) => playerIds.has(element.id)).map((element) => [element.id, element.stats?.total_points ?? 0]));
    const byName = Object.fromEntries(bootstrap.elements.filter((element) => playerIds.has(element.id)).flatMap((element) => { const value = points[String(element.id)]; return [element.web_name, `${element.first_name ?? ""} ${element.second_name ?? ""}`].filter((name): name is string => Boolean(name)).map((name) => [clean(name), value]); }));
    return NextResponse.json({ gameweek, points, byName }, { headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ points: {} }, { status: 502 });
  }
}
