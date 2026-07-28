export type FplLeagueStanding = {
  entry?: number;
  [key: string]: unknown;
};

type FplLeagueManager = {
  entry?: number;
  [key: string]: unknown;
};

export type FplLeagueResponse = {
  standings: {
    results: FplLeagueStanding[];
    total: number;
  };
  new_entries: {
    results: unknown[];
    total: number;
  };
  league: unknown;
  fetched_at: string;
};

type FplStandingsPage = {
  league?: unknown;
  new_entries?: {
    results?: unknown[];
  };
  standings?: {
    results?: FplLeagueStanding[];
    has_next?: boolean;
  };
};

type EntryBadgeResponse = {
  club_badge_src?: unknown;
};

type CachedEntryBadge = {
  club_badge_src: string | null;
};

export type BadgeCache = {
  get(key: string): Promise<unknown>;
  setex(key: string, seconds: number, value: unknown): Promise<unknown>;
};

const FPL_BASE_URL = 'https://fantasy.premierleague.com';
const ENTRY_BADGE_CACHE_SECONDS = 60 * 60 * 24;
const DEFAULT_FETCH_TIMEOUT_MS = 8000;
const ENTRY_FETCH_CONCURRENCY = 5;

export function parsePositiveInteger(value: string | null, fallback?: number): number | null {
  if (value === null || value === '') {
    return typeof fallback === 'number' && Number.isInteger(fallback) && fallback > 0 ? fallback : null;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function shouldIncludeManagersInfo(searchParams: URLSearchParams): boolean {
  const value =
    searchParams.get('includeManagersInfo') ??
    searchParams.get('includeMangersInfo') ??
    searchParams.get('includeBadges');

  return value === '1' || value === 'true' || value === 'yes';
}

export function normalizeClubBadgeSrc(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const badgeSrc = value.trim();
  if (badgeSrc.startsWith('http://') || badgeSrc.startsWith('https://')) {
    return badgeSrc;
  }

  return badgeSrc.startsWith('/') ? `${FPL_BASE_URL}${badgeSrc}` : `${FPL_BASE_URL}/${badgeSrc}`;
}

async function fetchJsonWithTimeout<T>(
  url: string,
  {
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    fetchImpl = fetch,
  }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`FPL API error ${response.status} for ${url}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFplLeagueStandings(
  leagueId: number,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<FplLeagueResponse> {
  const allStandings: FplLeagueStanding[] = [];
  const allNewEntries: unknown[] = [];
  let league: unknown = null;
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const data = await fetchJsonWithTimeout<FplStandingsPage>(
      `${FPL_BASE_URL}/api/leagues-classic/${leagueId}/standings/?page_standings=${page}`,
      options
    );

    league = data.league ?? league;

    if (page === 1 && data.new_entries?.results?.length) {
      allNewEntries.push(...data.new_entries.results);
    }

    const pageResults = data.standings?.results ?? [];
    if (pageResults.length > 0) {
      allStandings.push(...pageResults);
      hasMorePages = Boolean(data.standings?.has_next);
      page += 1;
    } else {
      hasMorePages = false;
    }
  }

  return {
    standings: {
      results: allStandings,
      total: allStandings.length,
    },
    new_entries: {
      results: allNewEntries,
      total: allNewEntries.length,
    },
    league,
    fetched_at: new Date().toISOString(),
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = items[currentIndex];
      if (item !== undefined) {
        results[currentIndex] = await mapper(item);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function fetchEntryClubBadgeSrc(
  entryId: number,
  cache: BadgeCache,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<string | null> {
  const cacheKey = `fc-footy:fpl-entry-badge-v1:${entryId}`;
  const cached = await cache.get(cacheKey);

  if (typeof cached === 'string') {
    return cached;
  }

  if (
    cached &&
    typeof cached === 'object' &&
    'club_badge_src' in cached &&
    ((cached as CachedEntryBadge).club_badge_src === null ||
      typeof (cached as CachedEntryBadge).club_badge_src === 'string')
  ) {
    return (cached as CachedEntryBadge).club_badge_src;
  }

  let badgeSrc: string | null = null;

  try {
    const entry = await fetchJsonWithTimeout<EntryBadgeResponse>(
      `${FPL_BASE_URL}/api/entry/${entryId}/`,
      options
    );
    badgeSrc = normalizeClubBadgeSrc(entry.club_badge_src);
  } catch (error) {
    console.warn(`Failed to fetch FPL entry badge for ${entryId}:`, error);
  }

  try {
    await cache.setex(cacheKey, ENTRY_BADGE_CACHE_SECONDS, { club_badge_src: badgeSrc });
  } catch (error) {
    console.error(`Failed to cache FPL entry badge for ${entryId}:`, error);
  }

  return badgeSrc;
}

export async function enrichLeagueWithManagerBadges(
  leagueData: FplLeagueResponse,
  cache: BadgeCache,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<FplLeagueResponse> {
  const newEntryManagers = leagueData.new_entries.results.filter(
    (manager): manager is FplLeagueManager => Boolean(manager) && typeof manager === 'object'
  );

  const uniqueEntryIds = Array.from(
    new Set(
      [...leagueData.standings.results, ...newEntryManagers]
        .map((manager) => manager.entry)
        .filter(
          (entryId): entryId is number =>
            typeof entryId === 'number' && Number.isSafeInteger(entryId) && entryId > 0
        )
    )
  );

  const badgePairs = await mapWithConcurrency(uniqueEntryIds, ENTRY_FETCH_CONCURRENCY, async (entryId) => {
    const badgeSrc = await fetchEntryClubBadgeSrc(entryId, cache, options);
    return [entryId, badgeSrc] as const;
  });

  const badgesByEntryId = new Map<number, string | null>(badgePairs);
  const addBadge = <T extends FplLeagueManager>(manager: T): T & { club_badge_src: string | null } => ({
    ...manager,
    club_badge_src:
      typeof manager.entry === 'number' && badgesByEntryId.has(manager.entry)
        ? badgesByEntryId.get(manager.entry) ?? null
        : null,
  });

  return {
    ...leagueData,
    standings: {
      ...leagueData.standings,
      results: leagueData.standings.results.map(addBadge),
    },
    new_entries: {
      ...leagueData.new_entries,
      results: leagueData.new_entries.results.map((manager) =>
        manager && typeof manager === 'object' ? addBadge(manager as FplLeagueManager) : manager
      ),
    },
  };
}
