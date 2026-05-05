import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import {
  createPendingFootyRegistrationRequest,
  FARCASTER_RECOVERY_PROXY,
  getBundlerRegistrationPrice,
  getFidByCustodyAddress,
  getFootyBundlerAddress,
} from '~/lib/farcaster/onboardingServer';
import { setPendingRegistrationRequest, upsertUserFarcasterAccount } from '~/lib/farcaster/store';

type PrepareRegistrationPayload = {
  walletAddress?: string;
  recoveryAddress?: string;
};

const DEFAULT_STORAGE_UNITS = BigInt(Number(process.env.FOOTY_FARCASTER_EXTRA_STORAGE_UNITS || '0'));

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const body = (await request.json().catch(() => ({}))) as PrepareRegistrationPayload;

    if (!body.walletAddress || !isAddress(body.walletAddress)) {
      return NextResponse.json({ error: 'A valid walletAddress is required' }, { status: 400 });
    }

    const walletAddress = body.walletAddress as `0x${string}`;
    const recoveryAddress = body.recoveryAddress && isAddress(body.recoveryAddress)
      ? (body.recoveryAddress as `0x${string}`)
      : FARCASTER_RECOVERY_PROXY;

    const existingFid = await getFidByCustodyAddress(walletAddress);
    if (existingFid) {
      const account = await upsertUserFarcasterAccount({
        userId: authUser.userId,
        fid: existingFid,
        username: null,
        displayName: null,
        custodyAddress: walletAddress.toLowerCase(),
        signerPublicKey: null,
        delegatedApp: 'footy',
        signerProvider: 'footy',
        signerStatus: 'none',
        signerCustody: 'server-managed',
        walletProvider: 'privy',
      });

      return NextResponse.json({ ok: true, existing: true, fid: existingFid, account });
    }

    const pending = await createPendingFootyRegistrationRequest(authUser.userId, walletAddress, recoveryAddress);
    const price = await getBundlerRegistrationPrice(DEFAULT_STORAGE_UNITS);
    await setPendingRegistrationRequest(pending);

    return NextResponse.json({
      ok: true,
      existing: false,
      requestId: pending.requestId,
      bundlerAddress: getFootyBundlerAddress(),
      extraStorage: DEFAULT_STORAGE_UNITS.toString(),
      price: price.toString(),
      signerPublicKey: pending.signerPublicKey,
      registerRequest: {
        to: pending.custodyAddress,
        recovery: pending.recoveryAddress,
        nonce: pending.registerNonce,
        deadline: pending.registerDeadline,
      },
      addRequest: {
        owner: pending.custodyAddress,
        keyType: 1,
        key: pending.signerPublicKey,
        metadataType: 1,
        metadata: pending.metadataHex,
        nonce: pending.addNonce,
        deadline: pending.addDeadline,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to prepare Farcaster registration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
