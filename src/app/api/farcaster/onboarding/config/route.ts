import { NextResponse } from 'next/server';
import { getMissingFootyFarcasterConfig } from '~/lib/farcaster/footySignerServer';

export async function GET() {
  const missing = getMissingFootyFarcasterConfig();

  return NextResponse.json({
    ok: missing.length === 0,
    missing,
  });
}

export const runtime = 'nodejs';
