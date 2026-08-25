import { NextRequest, NextResponse } from 'next/server';
import { AbiCoder, Contract, JsonRpcProvider, getAddress } from 'ethers';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { deleteActiveClaim, getClaimByFid, getClaimSeason } from '~/lib/fplClaimServer';
import { BASE_CHAIN_ID, BASE_EAS_ADDRESS, FPL_CLAIM_METHOD_FACT_CHALLENGE, FPL_CLAIM_SCHEMA_UID } from '~/lib/fplClaimConstants';

const EAS_ABI = [
  'function getAttestation(bytes32 uid) view returns (tuple(bytes32 uid,bytes32 schema,uint64 time,uint64 expirationTime,uint64 revocationTime,bool revocable,bytes32 refUID,address recipient,address attester,bytes data))',
];

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    if (!authUser.fid) {
      return NextResponse.json({ error: 'A verified Farcaster FID is required' }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as { attestationUid?: unknown };
    const attestationUid = typeof body.attestationUid === 'string' ? body.attestationUid : '';
    if (!/^0x[0-9a-fA-F]{64}$/.test(attestationUid)) {
      return NextResponse.json({ error: 'A valid attestation UID is required' }, { status: 400 });
    }

    const record = await getClaimByFid(getClaimSeason(), authUser.fid);
    if (!record || record.attestationUid.toLowerCase() !== attestationUid.toLowerCase()) {
      return NextResponse.json({ error: 'This Farcaster account does not own that active claim' }, { status: 403 });
    }

    const provider = new JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org', BASE_CHAIN_ID);
    const eas = new Contract(BASE_EAS_ADDRESS, EAS_ABI, provider);
    const attestation = await eas.getAttestation(attestationUid);
    const decoded = AbiCoder.defaultAbiCoder().decode(
      ['uint64', 'uint32', 'uint16', 'bytes32', 'uint8'],
      attestation.data
    );
    const wallet = getAddress(record.wallet);

    if (
      attestation.uid.toLowerCase() !== attestationUid.toLowerCase() ||
      attestation.schema.toLowerCase() !== FPL_CLAIM_SCHEMA_UID.toLowerCase() ||
      getAddress(attestation.attester) !== wallet ||
      getAddress(attestation.recipient) !== wallet ||
      decoded[0] !== BigInt(record.fid) ||
      decoded[1] !== BigInt(record.entryId) ||
      decoded[2] !== BigInt(record.season) ||
      String(decoded[3]).toLowerCase() !== record.evidenceHash.toLowerCase() ||
      decoded[4] !== BigInt(FPL_CLAIM_METHOD_FACT_CHALLENGE)
    ) {
      return NextResponse.json({ error: 'The revoked attestation does not match this active claim' }, { status: 400 });
    }
    if (attestation.revocationTime === 0n) {
      return NextResponse.json({ error: 'Revoke this attestation on Base before releasing the team' }, { status: 409 });
    }

    const released = await deleteActiveClaim(record);
    if (!released) {
      return NextResponse.json({ error: 'The claim changed while it was being released; refresh and try again' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, released: { ...record, status: 'revoked' } });
  } catch (error) {
    console.error('[fpl-claim/release]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to release FPL claim' }, { status: 400 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
