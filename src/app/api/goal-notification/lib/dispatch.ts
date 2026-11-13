// Single dispatcher for all goal-notification leagues.
//
// One Vercel cron (every minute) replaces the old 11 per-league crons.
// Each league is gated on its fixture calendar first (see gate.ts): when
// nothing is live, the league costs one cached Redis read and no ESPN
// fetch. When a match is live, the league runs exactly as its old route
// did, via the shared runner. Leagues run in parallel — they are fully
// independent (disjoint Redis keys, disjoint ESPN endpoints).
//
// A gate failure fails open (the league still polls), and a league
// failure never blocks the others.

import { goalRedis, LEAGUES, type LeagueConfig } from "./leagues";
import { getGate } from "./gate";
import { runLeague } from "./runLeague";

export type LeagueDispatchResult = {
  id: string;
  label: string;
  status: "skipped" | "polled" | "error";
  notificationsSent: number;
  nextKickoff: number | null;
  error?: string;
};

export type DispatchSummary = {
  success: boolean;
  timestamp: string;
  leagues: LeagueDispatchResult[];
  totals: { skipped: number; polled: number; errors: number; notificationsSent: number };
};

async function dispatchLeague(
  league: LeagueConfig,
  now: number,
): Promise<LeagueDispatchResult> {
  const gate = await getGate(league, now);
  if (!gate.open) {
    return {
      id: league.id,
      label: league.label,
      status: "skipped",
      notificationsSent: 0,
      nextKickoff: gate.nextKickoff,
    };
  }
  const run = await runLeague(league);
  return {
    id: league.id,
    label: league.label,
    status: run.success ? "polled" : "error",
    notificationsSent: run.notificationsSent,
    nextKickoff: gate.nextKickoff,
    error: run.error,
  };
}

export async function runDispatch(
  now: number = Date.now(),
): Promise<DispatchSummary> {
  const results = await Promise.allSettled(
    LEAGUES.map((league) => dispatchLeague(league, now)),
  );
  const leagues: LeagueDispatchResult[] = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          id: LEAGUES[i].id,
          label: LEAGUES[i].label,
          status: "error" as const,
          notificationsSent: 0,
          nextKickoff: null,
          error: String(r.reason?.message ?? r.reason),
        },
  );
  const totals = {
    skipped: leagues.filter((l) => l.status === "skipped").length,
    polled: leagues.filter((l) => l.status === "polled").length,
    errors: leagues.filter((l) => l.status === "error").length,
    notificationsSent: leagues.reduce((s, l) => s + l.notificationsSent, 0),
  };
  const summary: DispatchSummary = {
    success: totals.errors === 0,
    timestamp: new Date().toISOString(),
    leagues,
    totals,
  };
  try {
    await goalRedis.set(
      "fc-footy:health:dispatcher",
      JSON.stringify(summary),
    );
  } catch {
    // Health reporting must never break the dispatch itself.
  }
  return summary;
}
