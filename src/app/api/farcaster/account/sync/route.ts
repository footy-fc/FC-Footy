import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getFidCustodyAddress } from '~/lib/farcaster/footySignerServer';
import { getUserFarcasterAccount, upsertUserFarcasterAccount } from '~/lib/farcaster/store';
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

    const existing = await getUserFarcasterAccount(authUser.userId);
    const custodyAddress =
      body.custodyAddress ||
      existing?.custodyAddress ||
      (await getFidCustodyAddress(body.fid).catch(() => null));

    const account = await upsertUserFarcasterAccount({
      userId: authUser.userId,
      fid: body.fid,
      username: body.username || existing?.username || null,
      displayName: body.displayName || existing?.displayName || null,
      pfpUrl: existing?.pfpUrl || null,
      bio: existing?.bio || null,
      custodyAddress: custodyAddress || null,
      signerPublicKey: body.signerPublicKey || existing?.signerPublicKey || null,
      delegatedApp: body.delegatedApp || 'footy',
      signerProvider: body.signerProvider || existing?.signerProvider || (body.runtime === 'miniapp' ? 'miniapp' : 'footy'),
      signerStatus: body.signerStatus || existing?.signerStatus || (body.signerPublicKey ? 'authorized' : 'none'),
      signerCustody: body.signerCustody || existing?.signerCustody || (body.runtime === 'miniapp' ? 'miniapp-hosted' : 'client-delegated'),
      walletProvider: body.walletProvider || existing?.walletProvider || (body.runtime === 'miniapp' ? 'miniapp' : 'privy'),
    });

    return NextResponse.json({ ok: true, account });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const runtime = 'nodejs';
