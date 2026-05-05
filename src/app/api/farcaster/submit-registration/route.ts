import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getFidByCustodyAddress, submitFootyBundlerRegistration } from '~/lib/farcaster/onboardingServer';
import {
  deletePendingRegistrationRequest,
  getPendingRegistrationRequest,
  setSignerSecret,
  upsertUserFarcasterAccount,
} from '~/lib/farcaster/store';

type SubmitRegistrationPayload = {
  requestId?: string;
  txHash?: string;
  registerSignature?: `0x${string}`;
  addSignature?: `0x${string}`;
};

const DEFAULT_STORAGE_UNITS = BigInt(Number(process.env.FOOTY_FARCASTER_EXTRA_STORAGE_UNITS || '0'));

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const body = (await request.json().catch(() => ({}))) as SubmitRegistrationPayload;

    if (!body.requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    const pending = await getPendingRegistrationRequest(body.requestId);
    if (!pending || pending.userId !== authUser.userId) {
      return NextResponse.json({ error: 'Pending Farcaster registration not found' }, { status: 404 });
    }

    const txHash =
      body.txHash ||
      (body.registerSignature && body.addSignature
        ? await submitFootyBundlerRegistration(
            pending,
            body.registerSignature as `0x${string}`,
            body.addSignature as `0x${string}`,
            DEFAULT_STORAGE_UNITS
          )
        : null);

    const fid = await getFidByCustodyAddress(pending.custodyAddress as `0x${string}`);
    if (!fid) {
      return NextResponse.json({ error: 'Farcaster registration is not visible onchain yet' }, { status: 409 });
    }

    await setSignerSecret(pending.userId, pending.signerPublicKey, pending.encryptedPrivateKey);
    const account = await upsertUserFarcasterAccount({
      userId: pending.userId,
      fid,
      username: null,
      displayName: null,
      custodyAddress: pending.custodyAddress,
      signerPublicKey: pending.signerPublicKey,
      delegatedApp: 'footy',
      signerProvider: 'footy',
      signerStatus: 'authorized',
      signerCustody: 'server-managed',
      walletProvider: 'privy',
    });

    await deletePendingRegistrationRequest(body.requestId);

    return NextResponse.json({
      ok: true,
      fid,
      txHash,
      account,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to finalize Farcaster registration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
