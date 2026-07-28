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
  fetchEntryClubBadgeSrc,
  normalizeClubBadgeSrc,
  parsePositiveInteger,
  shouldIncludeManagersInfo,
} = await import(pathToFileURL(bundlePath).href);

function makeLeague(entryIds) {
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
      results: [],
      total: 0,
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
    enriched = await enrichLeagueWithManagerBadges(makeLeague([1, 2]), cache, { fetchImpl });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(
    enriched.standings.results[0].club_badge_src,
    'https://fantasy.premierleague.com/premierleague/badges/1.png'
  );
  assert.equal(enriched.standings.results[1].club_badge_src, null);
  assert.equal(cache.store.get('fc-footy:fpl-entry-badge-v1:2').club_badge_src, null);
  assert.equal(enriched.standings.results[0].entry_name, 'Team 1');
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

await testValidation();
await testRelativeUrlNormalization();
await testPartialEntryFetchFailure();
await testConcurrencyAndCaching();

console.log('fpl-league api tests passed');
