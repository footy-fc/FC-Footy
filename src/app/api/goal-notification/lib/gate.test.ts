// Pure-logic tests for the fixture gate (no Redis, no network).
// Run: node --experimental-strip-types --test src/app/api/goal-notification/lib/gate.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWindows, isWindowOpen } from "./windows.ts";

const event = (id: string, date: string, state: string) => ({
  id,
  date,
  competitions: [
    {
      status: { type: { state, name: `STATUS_${state.toUpperCase()}` } },
    },
  ],
});

describe("buildWindows", () => {
  it("opens 15 min before kickoff and closes 210 min after", () => {
    const kickoff = Date.parse("2026-11-22T14:00:00Z");
    const windows = buildWindows([
      event("1", "2026-11-22T14:00:00Z", "pre") as never,
    ]);
    assert.equal(windows.length, 1);
    assert.equal(windows[0].start, kickoff - 15 * 60 * 1000);
    assert.equal(windows[0].end, kickoff + 210 * 60 * 1000);
  });

  it("includes pre, in and post events, skips unknown states and bad dates", () => {
    const windows = buildWindows([
      event("1", "2026-11-22T14:00:00Z", "pre") as never,
      event("2", "2026-11-22T16:30:00Z", "in") as never,
      event("3", "2026-11-21T14:00:00Z", "post") as never,
      event("4", "2026-11-22T14:00:00Z", "cancelled") as never,
      event("5", "not-a-date", "pre") as never,
    ]);
    assert.deepEqual(
      windows.map((w) => w.matchId),
      ["3", "1", "2"],
    );
  });
});

describe("isWindowOpen", () => {
  const windows = buildWindows([
    event("1", "2026-11-22T14:00:00Z", "pre") as never,
  ]);
  it("is closed well before kickoff", () => {
    assert.equal(isWindowOpen(windows, Date.parse("2026-11-22T10:00:00Z")), false);
  });
  it("is open during the match", () => {
    assert.equal(isWindowOpen(windows, Date.parse("2026-11-22T15:30:00Z")), true);
  });
  it("is open through extra time, closed the next morning", () => {
    assert.equal(isWindowOpen(windows, Date.parse("2026-11-22T17:25:00Z")), true);
    assert.equal(isWindowOpen(windows, Date.parse("2026-11-23T09:00:00Z")), false);
  });
});
