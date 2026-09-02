import assert from "node:assert/strict";
import test from "node:test";
import {
  isEventForFollowedTeams,
  normalizeFollowedTeamId,
} from "./followedMatches.ts";

const eventWithTeams = (...abbreviations: string[]) => ({
  competitions: [{
    competitors: abbreviations.map((abbreviation) => ({ team: { abbreviation } })),
  }],
});

test("normalizes stored team IDs before comparison", () => {
  assert.equal(normalizeFollowedTeamId(" ENG.1-LIV "), "eng.1-liv");
});

test("matches ESPN uppercase abbreviations to lowercase saved follows", () => {
  assert.equal(
    isEventForFollowedTeams(eventWithTeams("LIV", "ARS"), "eng.1", ["eng.1-liv"]),
    true
  );
  assert.equal(
    isEventForFollowedTeams(eventWithTeams("AVL", "CHE"), "eng.1", ["eng.1-avl"]),
    true
  );
});

test("keeps follows isolated to their selected competition", () => {
  assert.equal(
    isEventForFollowedTeams(eventWithTeams("ENG", "ESP"), "eng.1", ["fifa.worldq.uefa-eng"]),
    false
  );
});

test("does not include unrelated teams", () => {
  assert.equal(
    isEventForFollowedTeams(eventWithTeams("MCI", "TOT"), "eng.1", ["eng.1-liv", "eng.1-avl"]),
    false
  );
});
