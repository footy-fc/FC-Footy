import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getManagerPicks } from '~/lib/kvPicksStorage';
import { fetchUsersByFids } from '~/lib/hypersnap';
import { FPL_LEAGUE_ID } from '~/lib/config';
import { fetchFplLeagueStandings } from '~/lib/fplLeague';
import { getManagerRankBand } from '~/lib/managerRankBands';
import { getClaimsByEntries, getClaimSeason } from '~/lib/fplClaimServer';

interface ManagerLookup {
  entry_id: number;
  fid: number;
  team_name: string;
}

interface EntryHistoryResponse {
  current?: Array<{
    event: number;
    points: number;
    event_transfers: number;
    overall_rank?: number;
  }>;
}

// Minimal shape for the team entry root endpoint
interface EntryRootResponse {
  id?: number;
  player_first_name?: string;
  player_last_name?: string;
  name?: string;
  last_deadline_total_transfers?: number;
  chips?: Array<{
    name?: string;
    played_by_event?: number | null;
  }>;
}

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
});

async function getCurrentGameweek(): Promise<number> {
  // Try cached value first
  try {
    const cached = await redis.get('fc-footy:current-gameweek');
    if (cached) return cached as number;
  } catch {}

  const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; fc-footy/1.0)'
    }
  });
  if (!res.ok) throw new Error(`bootstrap-static ${res.status}`);
  const data: { events: Array<{ id: number; is_current?: boolean; finished?: boolean }> } = await res.json();
  const current = data.events.find(e => e.is_current);
  let gw = current?.id;
  if (!gw) {
    const latestFinished = data.events.filter(e => e.finished).sort((a, b) => b.id - a.id)[0];
    if (!latestFinished) throw new Error('No current or finished gameweeks');
    gw = latestFinished.id;
  }
  try { await redis.setex('fc-footy:current-gameweek', 3600, gw); } catch {}
  return gw!;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get('gameweek');
    const refresh = searchParams.get('refresh') === 'true';
    const gameweek = gwParam ? Math.max(1, Math.min(38, parseInt(gwParam, 10) || 0)) : await getCurrentGameweek();

    const cacheKey = `fc-footy:managers-gw-summary:v3:${gameweek}`;
    if (!refresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return NextResponse.json(cached);
      } catch {}
    }

    // Entry IDs change each season, so current standings are the primary
    // Manager Activity source. The checked-in lookup is only an outage fallback.
    const lookupModule = await import('../../../data/fantasy-managers-lookup.json');
    const maybeDefault: unknown = (lookupModule as { default?: unknown }).default;
    const legacyManagers: ManagerLookup[] = Array.isArray(maybeDefault)
      ? (maybeDefault as ManagerLookup[])
      : ((lookupModule as unknown) as ManagerLookup[]);
    const entryToRank = new Map<number, number>();
    let managers = legacyManagers;

    try {
      const standingsData = await fetchFplLeagueStandings(FPL_LEAGUE_ID);
      const rankedManagers = standingsData.standings.results.flatMap((standing) => {
        const entryId = Number(standing.entry);
        const rank = Number(standing.rank);
        if (!Number.isSafeInteger(entryId) || entryId <= 0 || !Number.isFinite(rank) || rank <= 0) {
          return [];
        }

        entryToRank.set(entryId, rank);
        return [{
          entryId,
          teamName: typeof standing.entry_name === 'string'
            ? standing.entry_name
            : typeof standing.player_name === 'string'
              ? standing.player_name
              : `Manager ${entryId}`,
        }];
      });

      const entryIds = rankedManagers.map((manager) => manager.entryId);
      const claims: Record<string, { fid: number }> = await getClaimsByEntries(
        getClaimSeason(),
        entryIds
      ).catch(() => ({}));
      const legacyByEntry = new Map(legacyManagers.map((manager) => [manager.entry_id, manager]));
      managers = rankedManagers.map((manager) => ({
        entry_id: manager.entryId,
        fid: claims[String(manager.entryId)]?.fid ?? legacyByEntry.get(manager.entryId)?.fid ?? 0,
        team_name: manager.teamName,
      }));
    } catch (standingsError) {
      console.warn('Manager Activity is using the fallback manager lookup:', standingsError);
    }

    // Fetch entry history for each manager and pick this GW's points/transfers
    const concurrency = 10;
    let idx = 0;
    const results: Array<{
      entry_id: number;
      fid: number;
      team_name: string;
      points: number;
      event_transfers: number;
      overall_rank: number | null;
      prev_event_transfers: number | null;
      transfersByEvent: Record<number, number>;
    }> = [];

    async function fetchOne(m: ManagerLookup) {
      try {
        // Initialize from KV if possible
        let points = 0;
        let transfers = 0;
        let overall_rank: number | null = null;
        let prev_event_transfers: number | null = null;
        const transfersByEvent: Record<number, number> = {};
        try {
          const cached = await getManagerPicks(m.entry_id, gameweek);
          const eh = cached?.entry_history;
          if (eh && typeof eh.points === 'number' && typeof eh.event_transfers === 'number') {
            points = eh.points ?? 0;
            transfers = eh.event_transfers ?? 0;
            overall_rank = typeof eh.overall_rank === 'number' ? eh.overall_rank : null;
          }
        } catch {}

        // Fetch full entry history to compute previous GW transfers precisely
        const res = await fetch(`https://fantasy.premierleague.com/api/entry/${m.entry_id}/history/`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; fc-footy/1.0)' }
        });
        if (!res.ok) throw new Error(String(res.status));
        const data: EntryHistoryResponse = await res.json();
        // Set current values if not from KV
        if (Array.isArray(data.current)) {
          const row = data.current.find(r => r.event === gameweek) || null;
          const prev = data.current.find(r => r.event === gameweek - 1) || null;
          for (const r of data.current) {
            if (typeof r.event === 'number' && typeof r.event_transfers === 'number') {
              transfersByEvent[r.event] = r.event_transfers;
            }
          }
          if (row) {
            points = typeof row.points === 'number' ? row.points : points;
            transfers = typeof row.event_transfers === 'number' ? row.event_transfers : transfers;
            overall_rank = typeof row.overall_rank === 'number' ? row.overall_rank : overall_rank;
          }
          if (prev) {
            prev_event_transfers = typeof prev.event_transfers === 'number' ? prev.event_transfers : null;
          }
        }
        results.push({ entry_id: m.entry_id, fid: m.fid, team_name: m.team_name, points, event_transfers: transfers, overall_rank, prev_event_transfers, transfersByEvent });
      } catch {
        results.push({ entry_id: m.entry_id, fid: m.fid, team_name: m.team_name, points: 0, event_transfers: 0, overall_rank: null, prev_event_transfers: null, transfersByEvent: {} });
      }
    }

    async function worker() {
      while (idx < managers.length) {
        const i = idx++;
        await fetchOne(managers[i]);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    // Enrich with chip availability (triple captain remaining) via entry root
    const entryExtras: Record<number, { has_3xc_remaining: boolean; chip_prev_reset: boolean; resetEvents: Set<number> }> = {};
    try {
      let j = 0;
      const conc2 = 8;
      const uniqEntries = results.map(r => r.entry_id).filter((v, i, a) => a.indexOf(v) === i);
      async function fetchEntry(entryId: number) {
        try {
          const r = await fetch(`https://fantasy.premierleague.com/api/entry/${entryId}/`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; fc-footy/1.0)' }
          });
          if (!r.ok) throw new Error(`entry ${r.status}`);
          const data: EntryRootResponse = await r.json();
          const chips = Array.isArray(data.chips) ? data.chips : [];
          const used3x = chips.some(c => (c?.name || '').toLowerCase() === '3xc' && typeof c?.played_by_event === 'number');
          const resetEvents = new Set<number>();
          const chipPrev = chips.some(c => {
            const nm = (c?.name || '').toLowerCase();
            const ev = c?.played_by_event;
            const isReset = (nm === 'freehit' || nm === 'wildcard') && typeof ev === 'number';
            if (isReset) resetEvents.add(ev as number);
            return isReset && (ev === (gameweek - 1));
          });
          entryExtras[entryId] = { has_3xc_remaining: !used3x, chip_prev_reset: chipPrev, resetEvents };
        } catch {
          // Default conservative values
          entryExtras[entryId] = { has_3xc_remaining: true, chip_prev_reset: false, resetEvents: new Set<number>() };
        }
      }
      await Promise.all(Array.from({ length: conc2 }, async () => {
        while (j < uniqEntries.length) {
          const e = uniqEntries[j++];
          await fetchEntry(e);
        }
      }));
    } catch {}

    // Enrich with Farcaster username & pfp via HyperSnap
    const fidList = results.map(r => r.fid).filter((v, i, a) => v > 0 && a.indexOf(v) === i);
    const fidToUser: Record<number, { username?: string; pfp_url?: string }> = {};
    try {
      const users = await fetchUsersByFids(fidList);
      for (const user of users) {
        fidToUser[user.fid] = {
          username: user.username?.toLowerCase(),
          pfp_url: user.pfp_url,
        };
      }
    } catch {}

    // Build final payload with rank, bucket, username, pfp
    const finalManagers = results.map(m => {
      const rank = entryToRank.get(m.entry_id) || null as number | null;
      const bucket = getManagerRankBand(rank) ?? 'unranked';
      const fc = fidToUser[m.fid] || {};
      // Exact starting FT calculation by simulating season up to (gameweek - 1)
      const extra = entryExtras[m.entry_id] || { has_3xc_remaining: true, chip_prev_reset: false, resetEvents: new Set<number>() };
      const transfersByEvent = m.transfersByEvent || {};
      let starting_fts = 1; // GW1 starts at 1
      for (let ev = 1; ev <= Math.max(1, gameweek - 1); ev++) {
        if (ev === gameweek) break; // simulate up to previous GW
        if (extra.resetEvents.has(ev)) {
          // Wildcard/FreeHit played in GW ev → next GW starts at 1
          starting_fts = 1;
        } else {
          const used = Math.max(0, Math.floor(transfersByEvent[ev] ?? 0));
          const remainingAfter = Math.max(0, starting_fts - used);
          starting_fts = Math.min(2, remainingAfter + 1);
        }
      }
      const ft_bucket = starting_fts; // current GW starting FTs (1 or 2)
      const ft_remaining = Math.max(0, starting_fts - (m.event_transfers || 0));
      // Next GW starting FTs (for UI that cares about "going into next GW")
      const usedThis = Math.max(0, Math.floor(m.event_transfers || 0));
      const next_from_spend = Math.max(0, starting_fts - usedThis);
      const ft_bucket_next = extra.resetEvents.has(gameweek) ? 1 : Math.min(2, next_from_spend + 1);
      return {
        ...m,
        rank,
        bucket,
        username: fc.username || null,
        pfp_url: fc.pfp_url || null,
        ft_bucket,
        ft_remaining,
        has_3xc_remaining: extra.has_3xc_remaining,
        ft_bucket_next,
      };
    });

    const payload = {
      gameweek,
      fetched_at: new Date().toISOString(),
      managers: finalManagers
    };
    try {
      await redis.setex(cacheKey, 1800, payload); // cache 30 minutes
    } catch {}
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to build summary', details: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
