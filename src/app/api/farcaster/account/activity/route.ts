import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getFarcasterActionLogs, getFarcasterActionLogsByFid } from '~/lib/farcaster/store';

export async function GET(request: NextRequest) {
  const fidParam = request.nextUrl.searchParams.get('fid');
  const parsedFid = fidParam ? Number(fidParam) : NaN;

  try {
    const authUser = await authenticateFootyUser(request);
    const byUserId = await getFarcasterActionLogs(authUser.userId);
    const fallbackFid = Number.isFinite(parsedFid) && parsedFid > 0 ? parsedFid : authUser.fid;
    const byFid = fallbackFid ? await getFarcasterActionLogsByFid(fallbackFid) : [];
    const logs = [...byUserId, ...byFid]
      .filter((log, index, list) => list.findIndex((entry) => entry.timestamp === log.timestamp && entry.hash === log.hash && entry.text === log.text) === index)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 50);

    return NextResponse.json({
      ok: true,
      logs,
    });
  } catch (error) {
    if (Number.isFinite(parsedFid) && parsedFid > 0) {
      const logs = await getFarcasterActionLogsByFid(parsedFid);
      return NextResponse.json({
        ok: true,
        logs,
      });
    }

    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const runtime = 'nodejs';
