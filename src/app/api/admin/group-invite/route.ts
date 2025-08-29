import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const base = process.env.FARCASTER_GC_API && process.env.FARCASTER_GC_API.trim().length > 0
      ? process.env.FARCASTER_GC_API
      : 'https://api.farcaster.xyz';
    const token = process.env.FARCASTER_GC_TOKEN;
    if (!token) return NextResponse.json({ error: 'FARCASTER_GC_TOKEN not configured' }, { status: 500 });
    const url = `${base.replace(/\/$/, '')}/fc/group-invites`;

    // Expect { groupId: string, invitees: [{ fid: number, role?: 'member'|'admin' }] }
    const payload = {
      groupId: body?.groupId,
      invitees: Array.isArray(body?.invitees) ? body.invitees : [],
    };
    if (!payload.groupId || payload.invitees.length === 0) {
      return NextResponse.json({ error: 'Missing groupId or invitees' }, { status: 400 });
    }

    const upstream = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json({ error: 'Upstream error', status: upstream.status, data }, { status: 502 });
    return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to invite to group' }, { status: 500 });
  }
}

