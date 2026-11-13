// Fixture gate: decide whether a league is worth polling this minute.
//
// The old system fetched every league's ESPN scoreboard every minute,
// 24/7, even in the off-season. The gate replaces that with a cached
// calendar of live windows, built from ESPN's scoreboard `dates` parameter
// (verified live 2026-11-13: `?dates=20261108` returns that day's 5 EPL
// matches, `?dates=20261113` returns 0, `?dates=20261122` returns 2 `pre`
// matches).
//
// A window runs from 15 minutes before kickoff to 210 minutes after it,
// which covers extra time and penalties. The gate is cached in Redis and
// refreshed at most once every 6 hours while no window is near, so a
// league with no fixtures costs ~4 small ESPN fetches a day instead of
// 1,440. A refresh failure fails OPEN — never skip a poll because the
// gate itself broke; a missed goal is worse than a wasted fetch.

import { goalRedis, scoreboardUrl, LEAGUES, type LeagueConfig } from "./leagues";
import { fetchJSONWithRetry } from "../../lib/http";
import type { ApiResponse } from "../../lib/types";
import {
  buildWindows,
  isWindowOpen,
  nextKickoff,
  type GateWindow,
} from "./windows";

export type GateStatus = {
  open: boolean;
  windows: GateWindow[];
  /** Next window start after now, if any. */
  nextKickoff: number | null;
  /** True when the cached calendar could not be refreshed. */
  stale: boolean;
};

const GATE_REFRESH_MS = 6 * 60 * 60 * 1000;
const GATE_LOOKAHEAD_DAYS = 3; // today + next 2 days

function gateKey(league: LeagueConfig): string {
  return `fc-footy:gate:${league.id}`;
}

function dateParam(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

type CachedGate = { updatedAt: number; windows: GateWindow[] };

async function readCachedGate(
  league: LeagueConfig,
): Promise<CachedGate | null> {
  try {
    const raw = await goalRedis.get(gateKey(league));
    if (!raw) return null;
    const parsed =
      typeof raw === "string" ? JSON.parse(raw) : (raw as CachedGate);
    if (
      !parsed ||
      typeof parsed.updatedAt !== "number" ||
      !Array.isArray(parsed.windows)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function refreshGate(league: LeagueConfig): Promise<GateWindow[]> {
  const windows: GateWindow[] = [];
  const today = new Date();
  for (let i = 0; i < GATE_LOOKAHEAD_DAYS; i++) {
    const day = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const url = `${scoreboardUrl(league)}?dates=${dateParam(day)}`;
    const data = await fetchJSONWithRetry<ApiResponse>(url, {
      retries: 2,
      timeoutMs: 5000,
      backoffMs: 400,
    });
    if (data.events) windows.push(...buildWindows(data.events));
  }
  windows.sort((a, b) => a.start - b.start);
  try {
    await goalRedis.set(
      gateKey(league),
      JSON.stringify({ updatedAt: Date.now(), windows }),
    );
  } catch {
    // A failed cache write just means the next call refreshes again.
  }
  return windows;
}

export async function getGate(
  league: LeagueConfig,
  now: number = Date.now(),
): Promise<GateStatus> {
  const cached = await readCachedGate(league);
  if (cached) {
    if (isWindowOpen(cached.windows, now)) {
      return {
        open: true,
        windows: cached.windows,
        nextKickoff: nextKickoff(cached.windows, now),
        stale: false,
      };
    }
    // No window open. Trust the calendar unless it is old enough that a
    // rescheduled fixture could have appeared since it was built.
    if (now - cached.updatedAt < GATE_REFRESH_MS) {
      return {
        open: false,
        windows: cached.windows,
        nextKickoff: nextKickoff(cached.windows, now),
        stale: false,
      };
    }
  }
  try {
    const windows = await refreshGate(league);
    return {
      open: isWindowOpen(windows, now),
      windows,
      nextKickoff: nextKickoff(windows, now),
      stale: false,
    };
  } catch (err) {
    console.error(`Gate refresh failed for ${league.id}, failing open:`, err);
    return {
      open: true,
      windows: cached?.windows ?? [],
      nextKickoff: cached ? nextKickoff(cached.windows, now) : null,
      stale: true,
    };
  }
}

export async function refreshAllGates(): Promise<
  { id: string; windows: number; ok: boolean; error?: string }[]
> {
  const results = await Promise.allSettled(
    LEAGUES.map(async (league) => {
      const windows = await refreshGate(league);
      return { id: league.id, windows: windows.length, ok: true as const };
    }),
  );
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          id: LEAGUES[i].id,
          windows: 0,
          ok: false as const,
          error: String(r.reason?.message ?? r.reason),
        },
  );
}
