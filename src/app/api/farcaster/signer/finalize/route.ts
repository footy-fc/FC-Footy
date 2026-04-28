import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { deletePendingSignerRequest, getPendingSignerRequest, setSignerSecret, upsertUserFarcasterAccount } from '~/lib/farcaster/store';
import { submitFootySignerAddFor } from '~/lib/farcaster/footySignerServer';

type FinalizePayload = {
  requestId?: string;
  username?: string;
  displayName?: string;
  addSignature?: string;
};

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const body = (await request.json().catch(() => ({}))) as FinalizePayload;

    if (!body.requestId || !body.addSignature) {
      return NextResponse.json({ error: 'requestId and addSignature are required' }, { status: 400 });
    }

    const pending = await getPendingSignerRequest(body.requestId);
    if (!pending || pending.userId !== authUser.userId) {
      return NextResponse.json({ error: 'Pending Footy signer request not found' }, { status: 404 });
    }

    const txHash = await submitFootySignerAddFor(pending, body.addSignature as `0x${string}`);
    await setSignerSecret(pending.userId, pending.signerPublicKey, pending.encryptedPrivateKey);

    const account = await upsertUserFarcasterAccount({
      userId: pending.userId,
      fid: pending.fid,
      username: body.username || null,
      displayName: body.displayName || null,
      custodyAddress: pending.custodyAddress,
      signerPublicKey: pending.signerPublicKey,
      delegatedApp: 'footy',
      signerProvider: 'footy',
      signerStatus: 'authorized',
      signerCustody: 'server-managed',
      walletProvider: 'privy',
    });

    await deletePendingSignerRequest(body.requestId);

    return NextResponse.json({
      ok: true,
      txHash,
      account,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to finalize Footy signer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
