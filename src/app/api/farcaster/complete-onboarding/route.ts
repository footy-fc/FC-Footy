import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getUserFarcasterAccount } from '~/lib/farcaster/store';

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const account = await getUserFarcasterAccount(authUser.userId);

    if (!account?.fid) {
      return NextResponse.json({ error: 'No Farcaster account is available for this Footy user' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, account });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete onboarding';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
