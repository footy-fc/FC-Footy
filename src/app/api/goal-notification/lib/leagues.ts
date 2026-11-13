// Shared league table for the goal-notification system.
//
// Every value here was extracted from the 11 per-league route handlers that
// used to live under src/app/api/goal-notification/*/route.ts. The handlers
// differed only in these fields (plus two behaviour families, see `mode`),
// so a shared runner can serve all of them without changing what any fan
// receives or which Redis keys dedupe state lives under.
//
// DO NOT "fix" the odd-looking values without checking live Redis first:
//  - eng-2 and eflcup intentionally share the unprefixed `fc-footy:match:`
//    namespace (ESPN event ids are globally unique).
//  - eflcup's fan lookup intentionally uses league id `eng.1`: EFL Cup
//    teams are registered by fans under their league team id.
//  - laliga's Redis prefix is `esp`, not `esp.1`.
//  - worldcup's match-name suffix is "(World Cup)" but its titles and goal
//    messages use "(WORLD CUP)"; cwc's titles use "(Club World Cup)" but
//    its match/goal suffix is "(CWC)".
import { Redis } from "@upstash/redis";

export const goalRedis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export type LeagueMode = "full" | "goal-only";

// "full": kickoff + halftime + full-time + goal notifications (7 leagues).
// "goal-only": goal notifications only, live matches only (4 leagues).
export type LeagueConfig = {
  /** Short id used in Redis keys and the health dashboard. */
  id: string;
  /** Human label, e.g. "EPL". */
  label: string;
  /** ESPN scoreboard slug, e.g. "eng.1". */
  espnSlug: string;
  /** Redis prefix for match/notification hashes, or null for the shared
   *  unprefixed `fc-footy:match:` namespace (eng-2, eflcup). */
  redisPrefix: string | null;
  /** Suffix in kickoff/halftime/full-time messages, e.g. "(EPL)". */
  matchSuffix: string;
  /** Suffix in notification titles, e.g. "(Club World Cup)". */
  titleSuffix: string;
  /** Suffix in goal messages, e.g. "(CWC)". */
  goalSuffix: string;
  /** Value used in the `league` field of the scoreboard-error response. */
  errorLeague: string;
  mode: LeagueMode;
  /** League id used for the goal-only fan lookup (`<fanLeagueId>-<abbr>`). */
  fanLeagueId?: string;
  /** Intersect recipients with the `fc-footy:users` set before sending.
   *  Only cwc does this among the "full" leagues; all "goal-only"
   *  leagues do. */
  intersectUsers: boolean;
};

export const LEAGUES: LeagueConfig[] = [
  {
    id: "epl",
    label: "EPL",
    espnSlug: "eng.1",
    redisPrefix: "epl",
    matchSuffix: "(EPL)",
    titleSuffix: "(EPL)",
    goalSuffix: "(EPL)",
    errorLeague: "epl",
    mode: "full",
    intersectUsers: false,
  },
  {
    id: "ucl",
    label: "UCL",
    espnSlug: "uefa.champions",
    redisPrefix: "ucl",
    matchSuffix: "(UCL)",
    titleSuffix: "(UCL)",
    goalSuffix: "(UCL)",
    errorLeague: "ucl",
    mode: "full",
    intersectUsers: false,
  },
  {
    id: "laliga",
    label: "La Liga",
    espnSlug: "esp.1",
    redisPrefix: "esp",
    matchSuffix: "(La Liga)",
    titleSuffix: "(La Liga)",
    goalSuffix: "(La Liga)",
    errorLeague: "laliga",
    mode: "full",
    intersectUsers: false,
  },
  {
    id: "bund",
    label: "Bundesliga",
    espnSlug: "ger.1",
    redisPrefix: "ger",
    matchSuffix: "(Bundesliga)",
    titleSuffix: "(Bundesliga)",
    goalSuffix: "(Bundesliga)",
    errorLeague: "bundesliga",
    mode: "goal-only",
    fanLeagueId: "ger.1",
    intersectUsers: true,
  },
  {
    id: "eng-2",
    label: "Championship",
    espnSlug: "eng.2",
    redisPrefix: null,
    matchSuffix: "(Championship)",
    titleSuffix: "(Championship)",
    goalSuffix: "(Championship)",
    errorLeague: "eng-2",
    mode: "goal-only",
    fanLeagueId: "eng.2",
    intersectUsers: true,
  },
  {
    id: "mls",
    label: "MLS",
    espnSlug: "usa.1",
    redisPrefix: "mls",
    matchSuffix: "(MLS)",
    titleSuffix: "(MLS)",
    goalSuffix: "(MLS)",
    errorLeague: "mls",
    mode: "goal-only",
    fanLeagueId: "usa.1",
    intersectUsers: true,
  },
  {
    id: "eflcup",
    label: "EFL Cup",
    espnSlug: "eng.league_cup",
    redisPrefix: null,
    matchSuffix: "(EFL Cup)",
    titleSuffix: "(EFL Cup)",
    goalSuffix: "(EFL Cup)",
    errorLeague: "efl-cup",
    mode: "goal-only",
    fanLeagueId: "eng.1",
    intersectUsers: true,
  },
  {
    id: "uel",
    label: "UEL",
    espnSlug: "uefa.europa",
    redisPrefix: "uel",
    matchSuffix: "(UEL)",
    titleSuffix: "(UEL)",
    goalSuffix: "(UEL)",
    errorLeague: "uel",
    mode: "full",
    intersectUsers: false,
  },
  {
    id: "cwc",
    label: "Club World Cup",
    espnSlug: "fifa.cwc",
    redisPrefix: "cwc",
    matchSuffix: "(CWC)",
    titleSuffix: "(Club World Cup)",
    goalSuffix: "(CWC)",
    errorLeague: "cwc",
    mode: "full",
    intersectUsers: true,
  },
  {
    id: "afcon",
    label: "AFCON",
    espnSlug: "caf.nations",
    redisPrefix: "afcon",
    matchSuffix: "(AFCON)",
    titleSuffix: "(AFCON)",
    goalSuffix: "(AFCON)",
    errorLeague: "afcon",
    mode: "full",
    intersectUsers: false,
  },
  {
    id: "worldcup",
    label: "FIFA World Cup",
    espnSlug: "fifa.world",
    redisPrefix: "worldcup",
    matchSuffix: "(World Cup)",
    titleSuffix: "(WORLD CUP)",
    goalSuffix: "(WORLD CUP)",
    errorLeague: "worldcup",
    mode: "full",
    intersectUsers: false,
  },
];

export function scoreboardUrl(league: LeagueConfig): string {
  return `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${league.espnSlug}/scoreboard`;
}

export function matchKey(league: LeagueConfig, matchId: string): string {
  return league.redisPrefix
    ? `fc-footy:${league.redisPrefix}:match:${matchId}`
    : `fc-footy:match:${matchId}`;
}

export function notificationsKey(
  league: LeagueConfig,
  matchId: string,
): string {
  // Only "full" leagues have a notifications hash; the prefix is always
  // set for them, so this never falls back to the shared namespace.
  return `fc-footy:${league.redisPrefix}:notifications:${matchId}`;
}
