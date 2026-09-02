import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinalWhistlePreference,
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
} from "./newsletterModel.ts";

const context = {
  entryId: 1234567,
  season: 2026,
  leagueIds: [143466],
  managerLabel: "KMac & Cheese",
};

test("email normalization and validation are deterministic", () => {
  assert.equal(normalizeNewsletterEmail("  Fan@Example.COM "), "fan@example.com");
  assert.equal(isValidNewsletterEmail("fan@example.com"), true);
  assert.equal(isValidNewsletterEmail("not-an-email"), false);
});

test("a new subscription records consent and server-resolved FPL context", () => {
  const preference = buildFinalWhistlePreference({
    userId: "farcaster:4163",
    fid: 4163,
    email: "fan@example.com",
    subscribed: true,
    context,
    now: "2026-09-02T12:00:00.000Z",
  });

  assert.equal(preference.fplEntryId, 1234567);
  assert.deepEqual(preference.fplLeagueIds, [143466]);
  assert.equal(preference.consentAt, "2026-09-02T12:00:00.000Z");
  assert.equal(preference.subscribedAt, "2026-09-02T12:00:00.000Z");
});

test("changing an email preserves the original subscription timestamps", () => {
  const existing = buildFinalWhistlePreference({
    userId: "farcaster:4163",
    email: "old@example.com",
    subscribed: true,
    context,
    now: "2026-09-02T12:00:00.000Z",
  });
  const updated = buildFinalWhistlePreference({
    userId: existing.userId,
    email: "new@example.com",
    subscribed: true,
    context,
    existing,
    now: "2026-09-03T12:00:00.000Z",
  });

  assert.equal(updated.consentAt, existing.consentAt);
  assert.equal(updated.subscribedAt, existing.subscribedAt);
});

test("unsubscribe and resubscribe record lifecycle timestamps", () => {
  const subscribed = buildFinalWhistlePreference({
    userId: "farcaster:4163",
    email: "fan@example.com",
    subscribed: true,
    context,
    now: "2026-09-02T12:00:00.000Z",
  });
  const unsubscribed = buildFinalWhistlePreference({
    userId: subscribed.userId,
    email: subscribed.email,
    subscribed: false,
    context,
    existing: subscribed,
    now: "2026-09-03T12:00:00.000Z",
  });
  const resubscribed = buildFinalWhistlePreference({
    userId: subscribed.userId,
    email: subscribed.email,
    subscribed: true,
    context,
    existing: unsubscribed,
    now: "2026-09-04T12:00:00.000Z",
  });

  assert.equal(unsubscribed.unsubscribedAt, "2026-09-03T12:00:00.000Z");
  assert.equal(resubscribed.unsubscribedAt, undefined);
  assert.equal(resubscribed.consentAt, "2026-09-04T12:00:00.000Z");
  assert.equal(resubscribed.subscribedAt, "2026-09-04T12:00:00.000Z");
});
