import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

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

    const cacheKey = `fc-footy:managers-gw-summary:${gameweek}`;
    if (!refresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return NextResponse.json(cached);
      } catch {}
    }

    // Load FEPL managers list
    const lookupModule = await import('../../../data/fantasy-managers-lookup.json');
    const maybeDefault: unknown = (lookupModule as { default?: unknown }).default;
    const managers: ManagerLookup[] = Array.isArray(maybeDefault)
      ? (maybeDefault as ManagerLookup[])
      : ((lookupModule as unknown) as ManagerLookup[]);

    // Fetch entry history for each manager and pick this GW's points/transfers
    const concurrency = 10;
    let idx = 0;
    const results: Array<{ entry_id: number; fid: number; team_name: string; points: number; event_transfers: number; overall_rank: number | null }> = [];

    async function fetchOne(m: ManagerLookup) {
      try {
        const res = await fetch(`https://fantasy.premierleague.com/api/entry/${m.entry_id}/history/`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; fc-footy/1.0)' }
        });
        if (!res.ok) throw new Error(String(res.status));
        const data: EntryHistoryResponse = await res.json();
        let points = 0;
        let transfers = 0;
        let overall_rank: number | null = null;
        if (Array.isArray(data.current)) {
          const row = data.current.find(r => r.event === gameweek)
            || data.current.slice().reverse().find(r => typeof r.points === 'number');
          if (row) {
            points = row.points ?? 0;
            transfers = row.event_transfers ?? 0;
            overall_rank = typeof row.overall_rank === 'number' ? row.overall_rank : null;
          }
        }
        results.push({ entry_id: m.entry_id, fid: m.fid, team_name: m.team_name, points, event_transfers: transfers, overall_rank });
      } catch {
        results.push({ entry_id: m.entry_id, fid: m.fid, team_name: m.team_name, points: 0, event_transfers: 0, overall_rank: null });
      }
    }

    async function worker() {
      while (idx < managers.length) {
        const i = idx++;
        await fetchOne(managers[i]);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    // Enrich with league rank using cached endpoint
    const entryToRank = new Map<number, number>();
    try {
      const standingsRes = await fetch(`${process.env.NEXT_PUBLIC_URL || ''}/api/fpl-league?leagueId=18526`).catch(() => fetch(`/api/fpl-league?leagueId=18526`));
      if (standingsRes && standingsRes.ok) {
        const standingsData = await standingsRes.json();
        const list = Array.isArray(standingsData?.standings?.results) ? standingsData.standings.results : [];
        for (const r of list) {
          if (typeof r.entry === 'number' && typeof r.rank === 'number') {
            entryToRank.set(r.entry, r.rank);
          }
        }
      }
    } catch {}

    // Enrich with Farcaster username & pfp via Merv Hub (no Neynar)
    const fidList = results.map(r => r.fid).filter((v, i, a) => a.indexOf(v) === i);
    const fidToUser: Record<number, { username?: string; pfp_url?: string }> = {};
    const mervFetch = async (fid: number) => {
      try {
        // Try cache first
        const cacheKey = `fc-footy:merv-user:${fid}`;
        try {
          const cached = await redis.get(cacheKey);
          if (cached && typeof cached === 'object' && cached !== null) {
            const cachedUser = cached as { username?: string; pfp_url?: string };
            fidToUser[fid] = { username: cachedUser.username, pfp_url: cachedUser.pfp_url };
            return;
          }
        } catch {}

        const r = await fetch(`https://hub.merv.fun/v1/userDataByFid?fid=${fid}`);
        if (!r.ok) return;
        const data: unknown = await r.json();
        const msgsRaw = (data as { messages?: unknown })?.messages;
        const msgs: Array<{ data?: { userDataBody?: { type?: string; value?: string } } }> = Array.isArray(msgsRaw)
          ? (msgsRaw as Array<{ data?: { userDataBody?: { type?: string; value?: string } } }>)
          : [];
        let username: string | undefined;
        let pfp_url: string | undefined;
        for (const m of msgs) {
          const t = m?.data?.userDataBody?.type;
          const val = m?.data?.userDataBody?.value;
          if (!t || typeof val !== 'string') continue;
          if (!username && (t === 'USER_DATA_TYPE_USERNAME' || t === 'USERNAME')) username = val.toLowerCase();
          if (!pfp_url && (t === 'USER_DATA_TYPE_PFP' || t === 'PFP' || t === 'USER_DATA_TYPE_PROFILE_PICTURE')) pfp_url = val;
        }
        fidToUser[fid] = { username, pfp_url };
        // Cache the result for 24 hours
        try {
          await redis.setex(cacheKey, 86400, { username, pfp_url });
        } catch {}
      } catch {}
    };
    // Limit concurrency to be nice to the hub
    const conc = 8;
    let i = 0;
    await Promise.all(Array.from({ length: conc }, async () => {
      while (i < fidList.length) await mervFetch(fidList[i++]);
    }));

    // Build final payload with rank, bucket, username, pfp
    const finalManagers = results.map(m => {
      const rank = entryToRank.get(m.entry_id) || null as number | null;
      let bucket = '151+';
      if (rank && rank >= 1 && rank <= 50) bucket = '1-50';
      else if (rank && rank <= 100) bucket = '51-100';
      else if (rank && rank <= 150) bucket = '101-150';
      const fc = fidToUser[m.fid] || {};
      return { ...m, rank, bucket, username: fc.username || null, pfp_url: fc.pfp_url || null };
    });

    const payload = {
      gameweek,
      fetched_at: new Date().toISOString(),
      managers: finalManagers
    };
    try {
      await redis.setex(cacheKey, 300, payload); // cache 5 minutes
    } catch {}
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to build summary', details: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
