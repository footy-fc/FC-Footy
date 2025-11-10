/* eslint-disable @typescript-eslint/no-explicit-any */
import { Redis } from "@upstash/redis";
import { fetchJSONWithRetry, okJson, errorAsOk } from "../../lib/http";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

type LeagueHealth = {
  id: string;
  label: string;
  scoreboardUrl: string;
};

const leagues: LeagueHealth[] = [
  { id: "epl", label: "EPL", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard" },
  { id: "ucl", label: "UCL", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard" },
  { id: "laliga", label: "La Liga", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard" },
  { id: "bund", label: "Bundesliga", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard" },
  { id: "eng-2", label: "Championship", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.2/scoreboard" },
  { id: "mls", label: "MLS", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard" },
  { id: "eflcup", label: "EFL Cup", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.league_cup/scoreboard" },
  { id: "uel", label: "UEL", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard" },
  { id: "cwc", label: "Club World Cup", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.cwc/scoreboard" },
  { id: "worldcup-uefa", label: "WCQ UEFA", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard" },
  { id: "worldcup-afc", label: "WCQ AFC", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.afc/scoreboard" },
  { id: "worldcup-concacaf", label: "WCQ CONCACAF", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.concacaf/scoreboard" },
  { id: "worldcup-conmebol", label: "WCQ CONMEBOL", scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.conmebol/scoreboard" },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeHistory = url.searchParams.get("includeHistory") === "1";
  const timestamp = new Date().toISOString();

  // Verify Redis read access without mutating state
  let redisOk = false;
  try {
    await redis.get("fc-footy:health:noop");
    redisOk = true;
  } catch (err) {
    redisOk = false;
  }

  const results = await Promise.all(
    leagues.map(async (lg) => {
      try {
        const data: any = await fetchJSONWithRetry(lg.scoreboardUrl, {
          retries: 3,
          timeoutMs: 8000,
          backoffMs: 600,
        });
        const events = Array.isArray(data?.events) ? data.events : [];
        const inCount = events.filter((e: any) => e?.competitions?.[0]?.status?.type?.state === "in").length;
        const postCount = events.filter((e: any) => e?.competitions?.[0]?.status?.type?.state === "post").length;
        const preCount = events.filter((e: any) => e?.competitions?.[0]?.status?.type?.state === "pre").length;
        return {
          id: lg.id,
          label: lg.label,
          ok: true,
          eventsCount: events.length,
          inCount,
          postCount,
          preCount,
        };
      } catch (err: any) {
        const failure = {
          id: lg.id,
          label: lg.label,
          ok: false,
          error: String(err?.message || err),
          ts: timestamp,
        };
        // Push failure to rolling log, keep last 200
        try {
          await redis.lpush("fc-footy:health:failures", JSON.stringify(failure));
          await redis.ltrim("fc-footy:health:failures", 0, 199);
        } catch {}
        return failure;
      }
    })
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
