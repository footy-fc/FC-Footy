import { NextRequest, NextResponse } from 'next/server';
import { setFanclubGroup, FanclubGroupRecord } from '~/lib/fanclubGroups';
import { PRIVILEGED_FIDS } from '~/config/privileged';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Optional teamId to persist mapping locally
    const teamId: string | undefined = body?.teamId;
    // Build upstream payload (strip our local-only fields)
    // Merge invitees with privileged admin FIDs (from config)
    const privilegedFids: number[] = PRIVILEGED_FIDS;
    type IncomingInvitee = { fid?: unknown; role?: 'member'|'admin' };
    const bodyInvitees: Array<{ fid: number; role?: 'member'|'admin' }> = Array.isArray(body?.invitees)
      ? (body.invitees as IncomingInvitee[]).filter((i) => typeof i?.fid === 'number').map((i) => ({ fid: Number(i.fid), role: i.role }))
      : [];
    const mergedInviteesMap = new Map<number, 'member'|'admin'>();
    // Add existing invitees
    for (const inv of bodyInvitees) {
      const role: 'member'|'admin' = inv.role === 'admin' ? 'admin' : 'member';
      mergedInviteesMap.set(inv.fid, role);
    }
    // Ensure privileged are admins
    for (const fid of privilegedFids) {
      mergedInviteesMap.set(fid, 'admin');
    }
    const mergedInvitees = Array.from(mergedInviteesMap.entries()).map(([fid, role]) => ({ fid, role }));

    const upstreamBody = {
      name: body?.name,
      description: body?.description,
      imageUrl: body?.imageUrl,
      generateInviteLink: body?.generateInviteLink,
      invitees: mergedInvitees,
      settings: body?.settings,
    };
    const base = process.env.FARCASTER_GC_API;
    const token = process.env.FARCASTER_GC_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'FARCASTER_GC_TOKEN not configured' }, { status: 500 });
    }
    // Default to Farcaster XYZ if base not provided
    const chosenBase = base && base.trim().length > 0 ? base : 'https://api.farcaster.xyz';
    const url = chosenBase.endsWith('/fc/group')
      ? chosenBase
      : `${chosenBase.replace(/\/$/, '')}/fc/group`;
    const upstream = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(upstreamBody),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error', status: upstream.status, data }, { status: 502 });
    }
    // Persist mapping if teamId provided
    try {
      if (teamId) {
        const groupId: string | undefined = data?.result?.groupId || data?.groupId;
        const inviteLinkUrl: string | undefined = data?.result?.inviteLinkUrl || data?.inviteLinkUrl;
        if (groupId) {
          const rec: FanclubGroupRecord = {
            teamId,
            groupId,
            inviteLinkUrl: inviteLinkUrl || null,
            provider: 'farcaster',
            name: upstreamBody.name,
            imageUrl: upstreamBody.imageUrl,
            createdByFid: null,
            createdAt: new Date().toISOString(),
            settings: upstreamBody.settings,
          };
          await setFanclubGroup(rec);
        }
      }
    } catch {}
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
