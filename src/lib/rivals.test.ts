import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePointSwing,
  initialRivalsInteractionState,
  resolveRivalsEmptyState,
  rivalsInteractionReducer,
  selectNearestRival,
} from "./rivals.ts";

test("calculatePointSwing applies ownership and captain multipliers", () => {
  assert.deepEqual(calculatePointSwing(6, 2, 0), {
    userImpact: 12,
    rivalImpact: 0,
    relativeSwing: 12,
  });
  assert.deepEqual(calculatePointSwing(-4, 1, 0), {
    userImpact: -4,
    rivalImpact: -0,
    relativeSwing: -4,
  });
});

test("selectNearestRival chooses the smallest points gap and then rank gap", () => {
  const rival = selectNearestRival(
    [
      { entry: 10, rank: 20, total: 100 },
      { entry: 11, rank: 19, total: 104 },
      { entry: 12, rank: 40, total: 96 },
      { entry: 13, rank: 21, total: 120 },
    ],
    10
  );
  assert.equal(rival?.entry, 11);
});

test("empty-state resolution prioritizes errors and covers linked/live gaps", () => {
  assert.equal(resolveRivalsEmptyState({ loading: true, entryId: null, hasMiniLeague: false, hasLiveMatch: false, eventCount: 0 }), "loading");
  assert.equal(resolveRivalsEmptyState({ loading: false, error: "offline", entryId: 1, hasMiniLeague: true, hasLiveMatch: true, eventCount: 2 }), "api-error");
  assert.equal(resolveRivalsEmptyState({ loading: false, entryId: null, hasMiniLeague: false, hasLiveMatch: false, eventCount: 0 }), "no-linked-team");
  assert.equal(resolveRivalsEmptyState({ loading: false, entryId: 1, hasMiniLeague: false, hasLiveMatch: false, eventCount: 0 }), "no-mini-league");
  assert.equal(resolveRivalsEmptyState({ loading: false, entryId: 1, hasMiniLeague: true, hasLiveMatch: false, eventCount: 0 }), "no-live-match");
});

test("interaction reducer opens contextual actions and records contest success", () => {
  const opened = rivalsInteractionReducer(initialRivalsInteractionState, { type: "open-banter", reply: "Never in doubt." });
  assert.equal(opened.sheet, "banter");
  assert.equal(opened.selectedReply, "Never in doubt.");
  const posted = rivalsInteractionReducer(opened, { type: "cast-posted" });
  assert.equal(posted.castStatus, "posted");
  const joined = rivalsInteractionReducer(posted, { type: "join-contest" });
  assert.equal(joined.joinedContest, true);
});
