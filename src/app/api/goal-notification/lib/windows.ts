// Pure fixture-window logic: no imports, no I/O, unit-testable.
// A window runs from 15 minutes before kickoff to 210 minutes after it,
// which covers extra time and penalties.
import type { MatchEvent } from "../../lib/types";

export type GateWindow = {
  start: number; // ms epoch, kickoff - 15 min
  end: number; // ms epoch, kickoff + 210 min
  matchId: string;
};

const WINDOW_BEFORE_MS = 15 * 60 * 1000;
const WINDOW_AFTER_MS = 210 * 60 * 1000;

/** Turn ESPN events into live windows. */
export function buildWindows(events: MatchEvent[]): GateWindow[] {
  const windows: GateWindow[] = [];
  for (const event of events) {
    // `date` is present in ESPN's payload but not in the repo's
    // MatchEvent type, so read it structurally.
    const kickoff = Date.parse(
      (event as unknown as { date?: string }).date ?? "",
    );
    if (!Number.isFinite(kickoff)) continue;
    const state = event.competitions?.[0]?.status?.type?.state;
    if (state !== "pre" && state !== "in" && state !== "post") continue;
    windows.push({
      start: kickoff - WINDOW_BEFORE_MS,
      end: kickoff + WINDOW_AFTER_MS,
      matchId: event.id,
    });
  }
  windows.sort((a, b) => a.start - b.start);
  return windows;
}

/** Is `now` inside any window? */
export function isWindowOpen(windows: GateWindow[], now: number): boolean {
  return windows.some((w) => now >= w.start && now <= w.end);
}

/** Next window start after `now`, if any. */
export function nextKickoff(
  windows: GateWindow[],
  now: number,
): number | null {
  const upcoming = windows.filter((w) => w.start > now);
  return upcoming.length ? upcoming[0].start : null;
}
