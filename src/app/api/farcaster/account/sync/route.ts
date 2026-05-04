import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { upsertUserFarcasterAccount } from '~/lib/farcaster/store';
import type { FootyDelegatedApp, FootySignerCustody, FootySignerProvider, FootySignerStatus, FootyWalletProvider } from '~/lib/farcaster/types';

type SyncPayload = {
  runtime: 'miniapp' | 'standalone';
  fid?: number;
  username?: string;
  displayName?: string;
  custodyAddress?: string;
  signerPublicKey?: string;
  delegatedApp?: FootyDelegatedApp;
  signerStatus?: FootySignerStatus;
  signerProvider?: FootySignerProvider;
  signerCustody?: FootySignerCustody;
  walletProvider?: FootyWalletProvider;
};

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const body = (await request.json()) as SyncPayload;

    if (!body?.fid || !Number.isFinite(body.fid)) {
      return NextResponse.json({ error: 'fid is required' }, { status: 400 });
    }

    const account = await upsertUserFarcasterAccount({
      userId: authUser.userId,
      fid: body.fid,
      username: body.username || null,
      displayName: body.displayName || null,
      custodyAddress: body.custodyAddress || null,
      signerPublicKey: body.signerPublicKey || null,
      delegatedApp: body.delegatedApp || 'footy',
      signerProvider: body.signerProvider || (body.runtime === 'miniapp' ? 'miniapp' : 'footy'),
      signerStatus: body.signerStatus || (body.signerPublicKey ? 'authorized' : 'none'),
      signerCustody: body.signerCustody || (body.runtime === 'miniapp' ? 'miniapp-hosted' : 'client-delegated'),
      walletProvider: body.walletProvider || (body.runtime === 'miniapp' ? 'miniapp' : 'privy'),
    });

    return NextResponse.json({ ok: true, account });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const runtime = 'nodejs';
