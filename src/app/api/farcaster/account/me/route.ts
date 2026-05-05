import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getUserFarcasterAccount } from '~/lib/farcaster/store';

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const account = await getUserFarcasterAccount(authUser.userId);
    return NextResponse.json({ ok: true, account });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const runtime = 'nodejs';
