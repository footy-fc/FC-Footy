import { NextRequest, NextResponse } from 'next/server';
import { getFanclubGroupByTeam, setFanclubGroup, FanclubGroupRecord } from '~/lib/fanclubGroups';

// Fan club chat join/create handler.
// If FARCASTER_GC_API is set, this forwards the request to that service.
// Otherwise, it returns a safe fallback (warpcast compose link) for testing.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const teamId = body?.teamId as string | undefined;
    const userFid = body?.userFid as number | null | undefined;
    const league = body?.league as string | undefined;
    const abbr = body?.abbr as string | undefined;

    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
    }

    // First, if we have a stored group for this team, return its invite link
    const stored = teamId ? await getFanclubGroupByTeam(teamId) : null;
    if (stored) {
      if (stored.inviteLinkUrl) {
        return NextResponse.json({ ok: true, teamId, groupId: stored.groupId, url: stored.inviteLinkUrl }, { headers: { 'Cache-Control': 'no-store' } });
      }
      // No invite link stored; still return the groupId for client-side handling
      return NextResponse.json({ ok: true, teamId, groupId: stored.groupId }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Prefer a dedicated join endpoint env if provided; else fall back to base
    const joinEndpoint = process.env.FARCASTER_GC_FANCLUB_JOIN || process.env.FARCASTER_GC_API;
    if (joinEndpoint) {
      try {
        const upstream = await fetch(joinEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join_or_create_fanclub',
            teamId,
            league,
            abbr,
            userFid: userFid ?? null,
          }),
        });
        const data = await upstream.json().catch(() => ({}));
        if (upstream.ok) {
          // Try to persist mapping if group info present
          try {
            const groupId: string | undefined = data?.result?.groupId || data?.groupId;
            const inviteLinkUrl: string | undefined = data?.result?.inviteLinkUrl || data?.inviteLinkUrl;
            if (teamId && groupId) {
              const rec: FanclubGroupRecord = {
                teamId,
                groupId,
                inviteLinkUrl: inviteLinkUrl || null,
                provider: 'farcaster',
                createdByFid: typeof userFid === 'number' ? userFid : null,
                createdAt: new Date().toISOString(),
              };
              await setFanclubGroup(rec);
            }
          } catch {}
          // Pass through relevant fields (including a possible deep link)
          return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });
        }
        // Fall back if upstream returns a non-OK status
        return NextResponse.json({ ok: false, upstreamStatus: upstream.status, data }, { status: 502 });
      } catch {
        // Upstream network error — fall back below
        // (quiet)
      }
    }

    // Fallback: return a compose link as a safe no-op for manual testing
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent('Hello from FC-Footy fan club ' + teamId)}`;
    return NextResponse.json({ ok: true, teamId, userFid: userFid ?? null, url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Failed to handle fanclub chat request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
    const stored = await getFanclubGroupByTeam(teamId);
    if (!stored) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    // Try to enrich with upstream group details (admin-only endpoint). Best-effort.
    let adminFids: number[] | undefined;
    try {
      const base = process.env.FARCASTER_GC_API && process.env.FARCASTER_GC_API.trim().length > 0
        ? process.env.FARCASTER_GC_API
        : 'https://api.farcaster.xyz';
      const token = process.env.FARCASTER_GC_TOKEN;
      if (token) {
        const url = `${base.replace(/\/$/, '')}/fc/group?groupId=${encodeURIComponent(stored.groupId)}`;
        const up = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (up.ok) {
          const j = await up.json();
          adminFids = (j?.result?.group?.adminFids as number[] | undefined) || undefined;
        }
      }
    } catch {}

    return NextResponse.json({ ok: true, teamId, groupId: stored.groupId, inviteLinkUrl: stored.inviteLinkUrl || null, adminFids }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
