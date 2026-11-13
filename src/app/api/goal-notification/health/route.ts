/* eslint-disable @typescript-eslint/no-explicit-any */
import { Redis } from "@upstash/redis";
import { okJson } from "../../lib/http";
import { LEAGUES } from "../lib/leagues";

// Health now reads the poll summaries the dispatcher writes to Redis
// (`fc-footy:health:poll:<league>`, one per league per poll) instead of
// re-fetching all 11 ESPN scoreboards itself. The old version was the
// single most expensive cron in the app: every 2 minutes it made 11
// parallel ESPN fetches just to report that polling works. Response
// shape is unchanged for the admin HealthTab.
const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeHistory = url.searchParams.get("includeHistory") === "1";
  const timestamp = new Date().toISOString();

  // Verify Redis read access without mutating state
  let redisOk = false;
  try {
    await redis.get("fc-footy:health:noop");
    redisOk = true;
  } catch {
    redisOk = false;
  }

  const results = await Promise.all(
    LEAGUES.map(async (lg) => {
      try {
        const raw = await redis.get(`fc-footy:health:poll:${lg.id}`);
        if (!raw) {
          return {
            id: lg.id,
            label: lg.label,
            ok: false,
            error: "No poll yet — dispatcher has not run for this league",
          };
        }
        const summary =
          typeof raw === "string" ? JSON.parse(raw) : (raw as any);
        return {
          id: lg.id,
          label: lg.label,
          ok: Boolean(summary.ok),
          eventsCount: summary.eventsCount ?? 0,
          inCount: summary.inCount ?? 0,
          postCount: summary.postCount ?? 0,
          preCount: summary.preCount ?? 0,
          ...(summary.ok ? {} : { error: summary.error ?? "Poll failed" }),
          lastPollAt: summary.ts,
        };
      } catch (err: any) {
        return {
          id: lg.id,
          label: lg.label,
          ok: false,
          error: String(err?.message || err),
        };
      }
    }),
  );

  let recentFailures: Array<{ id: string; label: string; error: string; ts: string }> | undefined;
  if (includeHistory) {
    try {
      const raw = (await (redis as any).lrange("fc-footy:health:failures", 0, 49)) as string[];
      recentFailures = raw
        .map((s) => {
          try { return JSON.parse(s); } catch { return null; }
        })
        .filter(Boolean);
    } catch {
      recentFailures = [];
    }
  }

  return okJson({
    success: true,
    timestamp,
    redisOk,
    leagues: results,
    recentFailures,
  });
}

export const runtime = "edge";
