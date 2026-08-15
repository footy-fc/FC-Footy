import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getFanclubTeams } from "~/lib/fanclubs/catalog";

/**
 * GET /api/fanclubs/top?limit=3
 *
 * Returns the club fan clubs with the most supporters, ordered by supporter
 * count. Used by the OG image (and anything else that needs a quick
 * "biggest fan clubs" snapshot) so callers never have to fan out one request
 * per club.
 *
 * Results are cached in Redis for CACHE_TTL_SECONDS so an OG render never
 * triggers a full SCARD sweep of the catalog.
 */

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

const CACHE_KEY = "fc-footy:fanclubs:top:v1";
const CACHE_TTL_SECONDS = 600;
const MAX_CACHED = 10;

export type TopFanclub = {
  teamId: string;
  name: string;
  abbreviation: string;
  leagueId: string;
  leagueName: string;
  logoUrl: string;
  fanCount: number;
};

type CachedPayload = {
  updatedAt: number;
  clubs: TopFanclub[];
};

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_CACHED);
}

function toCount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  // Upstash pipeline entries can arrive wrapped depending on client version
  if (value && typeof value === "object") {
    const wrapped = (value as { result?: unknown; data?: unknown }).result ??
      (value as { result?: unknown; data?: unknown }).data;
    if (wrapped !== undefined) return toCount(wrapped);
  }
  return 0;
}

async function computeTopFanclubs(): Promise<TopFanclub[]> {
  const teams = getFanclubTeams({ type: "club" });
  if (!teams.length) return [];

  const pipeline = redis.pipeline();
  for (const team of teams) {
    pipeline.scard(`fc-footy:team-fans:${team.teamId}`);
  }

  const results = await pipeline.exec();

  return teams
    .map((team, index) => ({
      teamId: team.teamId,
      name: team.name,
      abbreviation: team.abbreviation,
      leagueId: team.leagueId,
      leagueName: team.leagueName,
      logoUrl: team.logoUrl,
      fanCount: toCount(results?.[index]),
    }))
    .filter((club) => club.fanCount > 0)
    .sort((left, right) =>
      right.fanCount - left.fanCount || left.name.localeCompare(right.name)
    )
    .slice(0, MAX_CACHED);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));
  const skipCache = searchParams.get("refresh") === "true";

  try {
    let payload: CachedPayload | null = null;

    if (!skipCache) {
      try {
        payload = await redis.get<CachedPayload>(CACHE_KEY);
      } catch {
        payload = null;
      }
    }

    if (!payload?.clubs?.length) {
      const clubs = await computeTopFanclubs();
      payload = { updatedAt: Date.now(), clubs };

      if (clubs.length) {
        try {
          await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL_SECONDS });
        } catch {
          // cache write is best-effort
        }
      }
    }

    const clubs = payload.clubs.slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        updatedAt: payload.updatedAt,
        count: clubs.length,
        clubs,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch top fanclubs:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch top fanclubs", clubs: [] },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
