import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getFarcasterActionLogs } from '~/lib/farcaster/store';

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const logs = await getFarcasterActionLogs(authUser.userId);

    return NextResponse.json({
      ok: true,
      logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const runtime = 'nodejs';
