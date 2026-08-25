import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getClaimByFid, getClaimSeason, getClaimStatus } from '~/lib/fplClaimServer';

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    if (!authUser.fid) {
      return NextResponse.json({ error: 'A verified Farcaster FID is required' }, { status: 401 });
    }

    const rawEntryId = new URL(request.url).searchParams.get('entryId');
    const entryId = parsePositiveInteger(rawEntryId);
    if (rawEntryId === null) {
      return NextResponse.json({
        season: getClaimSeason(),
        fid: authUser.fid,
        byFid: await getClaimByFid(getClaimSeason(), authUser.fid),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (!entryId) return NextResponse.json({ error: 'entryId must be a positive integer' }, { status: 400 });

    return NextResponse.json(await getClaimStatus(getClaimSeason(), authUser.fid, entryId), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read claim status' }, { status: 401 });
  }
}

export const runtime = 'nodejs';
