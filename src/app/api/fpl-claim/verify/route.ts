import { NextRequest, NextResponse } from 'next/server';
import { AbiCoder } from 'ethers';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import {
  deleteChallenge,
  getChallenge,
  getClaimSeason,
  getClaimStatus,
  makeEvidenceHash,
  savePendingClaim,
} from '~/lib/fplClaimServer';
import {
  FPL_CLAIM_METHOD_FACT_CHALLENGE,
  FPL_CLAIM_SCHEMA_UID,
} from '~/lib/fplClaimConstants';

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    if (!authUser.fid) return NextResponse.json({ error: 'A verified Farcaster FID is required' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { challengeId?: unknown; answer?: unknown };
    const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
    const answer = typeof body.answer === 'string' ? body.answer : '';
    const challenge = await getChallenge(challengeId);

    if (!challenge || challenge.fid !== authUser.fid || challenge.expiresAt < Date.now()) {
      return NextResponse.json({ error: 'Challenge expired or unavailable' }, { status: 410 });
    }

    // A challenge is single-use, including after a wrong answer.
    await deleteChallenge(challengeId);
    if (answer !== challenge.answer) {
      return NextResponse.json({ error: 'Incorrect answer; select the team again to retry' }, { status: 400 });
    }

    const status = await getClaimStatus(getClaimSeason(), authUser.fid, challenge.entryId);
    if (!status.canClaim) {
      return NextResponse.json({ error: 'This identity or FPL team was claimed while you were answering', status }, { status: 409 });
    }

    const evidenceHash = makeEvidenceHash({
      challengeId,
      fid: authUser.fid,
      entryId: challenge.entryId,
      season: challenge.season,
      snapshotHash: challenge.snapshotHash,
      verifiedAt: new Date().toISOString(),
    });
    const encodedData = AbiCoder.defaultAbiCoder().encode(
      ['uint64', 'uint32', 'uint16', 'bytes32', 'uint8'],
      [authUser.fid, challenge.entryId, challenge.season, evidenceHash, FPL_CLAIM_METHOD_FACT_CHALLENGE]
    );
    const pending = await savePendingClaim({
      challengeId,
      fid: authUser.fid,
      entryId: challenge.entryId,
      season: challenge.season,
      evidenceHash,
      encodedData,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return NextResponse.json({
      claimToken: pending.claimToken,
      schemaUid: FPL_CLAIM_SCHEMA_UID,
      encodedData,
      evidenceHash,
      fid: pending.fid,
      entryId: pending.entryId,
      season: pending.season,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[fpl-claim/verify]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to verify FPL challenge' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
