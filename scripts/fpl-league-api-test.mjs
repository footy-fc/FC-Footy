import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const repoRoot = process.cwd();
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'fc-footy-fpl-league-test-'));
const bundlePath = path.join(tempDir, 'fplLeague.mjs');

await build({
  entryPoints: [path.join(repoRoot, 'src/lib/fplLeague.ts')],
  outfile: bundlePath,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
});

const {
  enrichLeagueWithManagerBadges,
  enrichLeagueWithManagerIdentities,
  fetchEntryClubBadgeSrc,
  fetchFplLeagueStandings,
  normalizeClubBadgeSrc,
  parsePositiveInteger,
  shouldIncludeManagerIdentities,
  shouldIncludeManagersInfo,
} = await import(pathToFileURL(bundlePath).href);

function makeLeague(entryIds, newEntryIds = []) {
  return {
    standings: {
      results: entryIds.map((entry, index) => ({
        entry,
        entry_name: `Team ${entry}`,
        player_name: `Manager ${entry}`,
        rank: index + 1,
        total: 0,
      })),
      total: entryIds.length,
    },
    new_entries: {
      results: newEntryIds.map((entry) => ({
        entry,
        entry_name: `New Team ${entry}`,
        joined_time: '2026-07-24T06:59:24.000000Z',
      })),
      total: newEntryIds.length,
    },
    league: {
      id: 143466,
      name: 'Farcaster Fantasy League',
    },
    fetched_at: '2026-07-28T00:00:00.000Z',
  };
}

function makeCache() {
  const store = new Map();
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setex(key, _seconds, value) {
      store.set(key, value);
    },
  };
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

async function testValidation() {
  assert.equal(parsePositiveInteger('143466'), 143466);
  assert.equal(parsePositiveInteger(null, 143466), 143466);
  assert.equal(parsePositiveInteger('0'), null);
  assert.equal(parsePositiveInteger('-1'), null);
  assert.equal(parsePositiveInteger('12.5'), null);
  assert.equal(parsePositiveInteger('abc'), null);

  assert.equal(shouldIncludeManagersInfo(new URLSearchParams('includeManagersInfo=1')), true);
  assert.equal(shouldIncludeManagersInfo(new URLSearchParams('includeMangersInfo=true')), true);
  assert.equal(shouldIncludeManagersInfo(new URLSearchParams('includeBadges=yes')), true);
  assert.equal(shouldIncludeManagersInfo(new URLSearchParams('includeManagersInfo=0')), false);
  assert.equal(shouldIncludeManagerIdentities(new URLSearchParams('includeManagersInfo=1')), true);
  assert.equal(shouldIncludeManagerIdentities(new URLSearchParams('includeMangersInfo=yes')), true);
  assert.equal(shouldIncludeManagerIdentities(new URLSearchParams('includeBadges=1')), false);
}

async function testRelativeUrlNormalization() {
  assert.equal(
    normalizeClubBadgeSrc('/premierleague/badges/example.png'),
    'https://fantasy.premierleague.com/premierleague/badges/example.png'
  );
  assert.equal(
    normalizeClubBadgeSrc('premierleague/badges/example.png'),
    'https://fantasy.premierleague.com/premierleague/badges/example.png'
  );
  assert.equal(
    normalizeClubBadgeSrc('https://resources.premierleague.com/premierleague/badges/example.png'),
    'https://resources.premierleague.com/premierleague/badges/example.png'
  );
  assert.equal(normalizeClubBadgeSrc(''), null);
}

async function testStandingsPagination() {
  const requestedPages = [];
  const fetchImpl = async (url) => {
    const searchParams = new URL(url).searchParams;
    const standingsPage = searchParams.get('page_standings');
    const newEntriesPage = searchParams.get('page_new_entries');
    requestedPages.push({ standingsPage, newEntriesPage });

    if (standingsPage === '1') {
      return jsonResponse({
        league: { id: 143466, name: 'Farcaster Fantasy League' },
        standings: {
          results: Array.from({ length: 50 }, (_, index) => ({ entry: index + 1 })),
          has_next: true,
        },
      });
    }

    if (standingsPage === '2') {
      return jsonResponse({
        standings: {
          results: Array.from({ length: 17 }, (_, index) => ({ entry: index + 51 })),
          has_next: false,
        },
      });
    }

    if (newEntriesPage === '1') {
      return jsonResponse({
        new_entries: {
          results: Array.from({ length: 50 }, (_, index) => ({ entry: index + 101 })),
          has_next: true,
        },
      });
    }

    if (newEntriesPage === '2') {
      return jsonResponse({
        new_entries: {
          results: Array.from({ length: 20 }, (_, index) => ({ entry: index + 151 })),
          has_next: false,
        },
      });
    }

    throw new Error(`Unexpected FPL request ${url}`);
  };

  const league = await fetchFplLeagueStandings(143466, { fetchImpl });

  assert.deepEqual(requestedPages, [
    { standingsPage: '1', newEntriesPage: null },
    { standingsPage: '2', newEntriesPage: null },
    { standingsPage: null, newEntriesPage: '1' },
    { standingsPage: null, newEntriesPage: '2' },
  ]);
  assert.equal(league.standings.results.length, 67);
  assert.equal(league.standings.total, 67);
  assert.equal(league.standings.results.at(-1).entry, 67);
  assert.equal(league.new_entries.results.length, 70);
  assert.deepEqual(league.league, { id: 143466, name: 'Farcaster Fantasy League' });
}

async function testPartialEntryFetchFailure() {
  const cache = makeCache();
  const fetchImpl = async (url) => {
    if (url.includes('/api/entry/1/')) {
      return jsonResponse({ club_badge_src: '/premierleague/badges/1.png' });
    }

    return jsonResponse({ error: 'upstream failed' }, { status: 500 });
  };

  const originalWarn = console.warn;
  let enriched;
  console.warn = () => {};
  try {
    enriched = await enrichLeagueWithManagerBadges(makeLeague([1, 2], [3]), cache, { fetchImpl });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(
    enriched.standings.results[0].club_badge_src,
    'https://fantasy.premierleague.com/premierleague/badges/1.png'
  );
  assert.equal(enriched.standings.results[1].club_badge_src, null);
  assert.equal(enriched.new_entries.results[0].club_badge_src, null);
  assert.equal(cache.store.get('fc-footy:fpl-entry-badge-v1:2').club_badge_src, null);
  assert.equal(enriched.standings.results[0].entry_name, 'Team 1');
  assert.equal(enriched.new_entries.results[0].entry_name, 'New Team 3');
}

async function testConcurrencyAndCaching() {
  const cache = makeCache();
  let activeFetches = 0;
  let maxActiveFetches = 0;
  let fetchCount = 0;

  const fetchImpl = async (url) => {
    activeFetches += 1;
    maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
    fetchCount += 1;

    await new Promise((resolve) => setTimeout(resolve, 10));

    const entryId = Number(url.match(/\/entry\/(\d+)\//)?.[1]);
    activeFetches -= 1;
    return jsonResponse({ club_badge_src: `/premierleague/badges/${entryId}.png` });
  };

  const entryIds = Array.from({ length: 12 }, (_, index) => index + 1);
  const first = await enrichLeagueWithManagerBadges(makeLeague(entryIds), cache, { fetchImpl });

  assert.equal(first.standings.results.length, 12);
  assert.equal(maxActiveFetches <= 5, true);
  assert.equal(fetchCount, 12);

  const cachedBadge = await fetchEntryClubBadgeSrc(1, cache, {
    fetchImpl: async () => {
      throw new Error('fetch should not run for cached badges');
    },
  });

  assert.equal(
    cachedBadge,
    'https://fantasy.premierleague.com/premierleague/badges/1.png'
  );
}

async function testManagerIdentityEnrichment() {
  const requestedClaims = [];
  const requestedFids = [];
  const league = await enrichLeagueWithManagerIdentities(makeLeague([1, 2], [3]), {
    season: 2026,
    async fetchClaimsByEntries(season, entryIds) {
      requestedClaims.push({ season, entryIds });
      return {
        '2': {
          fid: 4163,
          entryId: 2,
          season: 2026,
          attestationUid: `0x${'a'.repeat(64)}`,
          method: 1,
          status: 'active',
          createdAt: '2026-08-25T00:00:00.000Z',
        },
        '3': {
          fid: 9999,
          entryId: 3,
          season: 2026,
          attestationUid: `0x${'b'.repeat(64)}`,
          method: 1,
          status: 'revoked',
          createdAt: '2026-08-25T00:00:00.000Z',
        },
      };
    },
    async fetchUsersByFids(fids) {
      requestedFids.push(...fids);
      return [{ fid: 4163, username: 'kmacb.eth', display_name: 'KMac', pfp_url: 'https://example.com/kmac.png' }];
    },
  });

  assert.deepEqual(requestedClaims, [{ season: 2026, entryIds: [1, 2, 3] }]);
  assert.deepEqual(requestedFids, [4163]);
  assert.deepEqual(
    {
      fid: league.standings.results[0].fid,
      username: league.standings.results[0].username,
      pfp_url: league.standings.results[0].pfp_url,
      claim: league.standings.results[0].claim,
    },
    { fid: null, username: null, pfp_url: null, claim: null }
  );
  assert.equal(league.standings.results[1].fid, 4163);
  assert.equal(league.standings.results[1].username, 'kmacb.eth');
  assert.equal(league.standings.results[1].display_name, 'KMac');
  assert.equal(league.standings.results[1].pfp_url, 'https://example.com/kmac.png');
  assert.deepEqual(league.standings.results[1].claim, {
    status: 'active',
    season: 2026,
    attestation_uid: `0x${'a'.repeat(64)}`,
    method: 1,
    claimed_at: '2026-08-25T00:00:00.000Z',
  });
  assert.equal(league.new_entries.results[0].fid, null);
}

async function testProfileFailureKeepsVerifiedFid() {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const league = await enrichLeagueWithManagerIdentities(makeLeague([1101413]), {
      season: 2026,
      async fetchClaimsByEntries() {
        return {
          '1101413': {
            fid: 4163,
            entryId: 1101413,
            season: 2026,
            attestationUid: `0x${'c'.repeat(64)}`,
            method: 1,
            status: 'active',
            createdAt: '2026-08-25T00:00:00.000Z',
          },
        };
      },
      async fetchUsersByFids() {
        throw new Error('HyperSnap unavailable');
      },
    });

    assert.equal(league.standings.results[0].fid, 4163);
    assert.equal(league.standings.results[0].username, null);
    assert.equal(league.standings.results[0].pfp_url, null);
    assert.equal(league.standings.results[0].claim.status, 'active');
  } finally {
    console.warn = originalWarn;
  }
}

await testValidation();
await testRelativeUrlNormalization();
await testStandingsPagination();
await testPartialEntryFetchFailure();
await testConcurrencyAndCaching();
await testManagerIdentityEnrichment();
await testProfileFailureKeepsVerifiedFid();

console.log('fpl-league api tests passed');
