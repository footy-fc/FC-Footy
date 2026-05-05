import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getFidByCustodyAddress } from '~/lib/farcaster/onboardingServer';

type CheckFidPayload = {
  address?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckFidPayload;

    if (!body.address || !isAddress(body.address)) {
      return NextResponse.json({ error: 'A valid address is required' }, { status: 400 });
    }

    const fid = await getFidByCustodyAddress(body.address);
    return NextResponse.json({ ok: true, fid });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check Farcaster account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
