import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { createPendingFootySignerRequest, getFidCustodyAddress } from '~/lib/farcaster/footySignerServer';
import { setPendingSignerRequest, upsertUserFarcasterAccount } from '~/lib/farcaster/store';

type PreparePayload = {
  walletAddress?: string;
  fid?: number;
  username?: string;
  displayName?: string;
};

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const body = (await request.json().catch(() => ({}))) as PreparePayload;
    const fid = body.fid || authUser.fid;

    if (!fid || !Number.isFinite(fid)) {
      return NextResponse.json({ error: 'fid is required' }, { status: 400 });
    }

    if (!body.walletAddress || !isAddress(body.walletAddress)) {
      return NextResponse.json({ error: 'A valid walletAddress is required' }, { status: 400 });
    }

    const custodyAddress = await getFidCustodyAddress(fid);
    if (custodyAddress !== body.walletAddress.toLowerCase()) {
      return NextResponse.json({
        error: `Connected wallet is not the custody address for fid ${fid}`,
        custodyAddress,
      }, { status: 400 });
    }

    const pending = await createPendingFootySignerRequest(authUser.userId, fid, custodyAddress);
    await setPendingSignerRequest(pending);

    const account = await upsertUserFarcasterAccount({
      userId: authUser.userId,
      fid,
      username: body.username || null,
      displayName: body.displayName || null,
      custodyAddress,
      signerPublicKey: pending.signerPublicKey,
      delegatedApp: 'footy',
      signerProvider: 'footy',
      signerStatus: 'pending',
      signerCustody: 'server-managed',
      walletProvider: 'privy',
    });

    return NextResponse.json({
      ok: true,
      requestId: pending.requestId,
      custodyAddress,
      signerPublicKey: pending.signerPublicKey,
      addRequest: {
        owner: custodyAddress,
        keyType: 1,
        key: pending.signerPublicKey,
        metadataType: 1,
        metadata: pending.metadataHex,
        nonce: pending.addNonce,
        deadline: pending.deadline,
      },
      account,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to prepare Footy signer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
