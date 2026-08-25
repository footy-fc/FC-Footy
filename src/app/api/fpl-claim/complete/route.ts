import { NextRequest, NextResponse } from 'next/server';
import { AbiCoder, Contract, JsonRpcProvider, getAddress } from 'ethers';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import {
  deletePendingClaim,
  getClaimStatus,
  getPendingClaim,
  saveActiveClaim,
  type FplClaimRecord,
} from '~/lib/fplClaimServer';
import { BASE_EAS_ADDRESS, FPL_CLAIM_SCHEMA_UID } from '~/lib/fplClaimConstants';

const EAS_ABI = [
  'function getAttestation(bytes32 uid) view returns (tuple(bytes32 uid,bytes32 schema,uint64 time,uint64 expirationTime,uint64 revocationTime,bool revocable,bytes32 refUID,address recipient,address attester,bytes data))',
];

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    if (!authUser.fid) return NextResponse.json({ error: 'A verified Farcaster FID is required' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { claimToken?: unknown; attestationUid?: unknown };
    const claimToken = typeof body.claimToken === 'string' ? body.claimToken : '';
    const attestationUid = typeof body.attestationUid === 'string' ? body.attestationUid : '';
    const pending = await getPendingClaim(claimToken);

    if (!pending || pending.fid !== authUser.fid || pending.expiresAt < Date.now()) {
      return NextResponse.json({ error: 'Claim authorization expired or unavailable' }, { status: 410 });
    }

    const provider = new JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org', 8453);
    const eas = new Contract(BASE_EAS_ADDRESS, EAS_ABI, provider);
    const attestation = await eas.getAttestation(attestationUid);
    const recipient = getAddress(attestation.recipient);
    const attester = getAddress(attestation.attester);
    const decoded = AbiCoder.defaultAbiCoder().decode(
      ['uint64', 'uint32', 'uint16', 'bytes32', 'uint8'],
      attestation.data
    );

    if (
      attestation.uid.toLowerCase() !== attestationUid.toLowerCase() ||
      attestation.schema.toLowerCase() !== FPL_CLAIM_SCHEMA_UID.toLowerCase() ||
      attestation.revocationTime !== 0n ||
      attestation.time === 0n ||
      attester !== recipient ||
      decoded[0] !== BigInt(pending.fid) ||
      decoded[1] !== BigInt(pending.entryId) ||
      decoded[2] !== BigInt(pending.season) ||
      String(decoded[3]).toLowerCase() !== pending.evidenceHash.toLowerCase() ||
      decoded[4] !== 1n
    ) {
      return NextResponse.json({ error: 'The submitted attestation does not match this verified claim' }, { status: 400 });
    }

    const status = await getClaimStatus(pending.season, pending.fid, pending.entryId);
    if (!status.canClaim) {
      await deletePendingClaim(claimToken);
      return NextResponse.json({ error: 'This identity or FPL team already has an active claim', status }, { status: 409 });
    }

    const record: FplClaimRecord = {
      fid: pending.fid,
      entryId: pending.entryId,
      season: pending.season,
      wallet: recipient,
      attestationUid,
      evidenceHash: pending.evidenceHash,
      method: Number(decoded[4]),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const saved = await saveActiveClaim(record);
    await deletePendingClaim(claimToken);

    if (!saved) {
      return NextResponse.json({ error: 'The claim was taken by another attestation; refresh and try again' }, { status: 409 });
    }

    return NextResponse.json({ ok: true, claim: record, attester });
  } catch (error) {
    console.error('[fpl-claim/complete]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to finalize FPL claim' }, { status: 400 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
