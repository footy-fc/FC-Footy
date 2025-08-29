import { NextRequest, NextResponse } from 'next/server';
import { getFanclubGroupByTeam, setFanclubGroup, FanclubGroupRecord } from '~/lib/fanclubGroups';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
    const rec = await getFanclubGroupByTeam(teamId);
    if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, record: rec }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Simple API key guard like other admin routes
    const apiKey = req.headers.get('x-api-key');
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const teamId = body?.teamId as string | undefined;
    const groupId = body?.groupId as string | undefined;
    if (!teamId || !groupId) return NextResponse.json({ error: 'Missing teamId or groupId' }, { status: 400 });

    const record: FanclubGroupRecord = {
      teamId,
      groupId,
      inviteLinkUrl: body?.inviteLinkUrl || null,
      provider: body?.provider || 'farcaster',
      name: body?.name,
      imageUrl: body?.imageUrl,
      createdByFid: null,
      createdAt: new Date().toISOString(),
      settings: body?.settings,
    };
    await setFanclubGroup(record);
    return NextResponse.json({ ok: true, record }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Failed to override mapping' }, { status: 500 });
  }
}
