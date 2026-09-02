import assert from "node:assert/strict";
import test from "node:test";
import {
  getPrimaryClubPreference,
  makePrimaryClubPreference,
  toggleTeamPreference,
} from "./teamPreferenceModel.ts";

test("the first followed club becomes My club even when a country was followed first", () => {
  assert.deepEqual(
    toggleTeamPreference(["fifa.world-USA"], "eng.1-ars"),
    ["eng.1-ars", "fifa.world-USA"]
  );
});

test("making a followed club My club preserves every follow", () => {
  assert.deepEqual(
    makePrimaryClubPreference(
      ["eng.1-ars", "fifa.world-USA", "eng.1-liv"],
      "eng.1-liv"
    ),
    ["eng.1-liv", "eng.1-ars", "fifa.world-USA"]
  );
});

test("unfollowing My club promotes the next followed club", () => {
  const next = toggleTeamPreference(
    ["eng.1-ars", "fifa.world-USA", "eng.1-liv"],
    "eng.1-ars"
  );

  assert.equal(getPrimaryClubPreference(next), "eng.1-liv");
  assert.deepEqual(next, ["eng.1-liv", "fifa.world-USA"]);
});

test("countries can be followed without becoming My club", () => {
  const next = toggleTeamPreference(["eng.1-ars"], "fifa.world-USA");
  assert.equal(getPrimaryClubPreference(next), "eng.1-ars");
  assert.deepEqual(next, ["eng.1-ars", "fifa.world-USA"]);
});
