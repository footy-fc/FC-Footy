import { NextRequest, NextResponse } from 'next/server';
import { AbiCoder, Contract, Interface, JsonRpcProvider, getAddress, id, zeroPadValue } from 'ethers';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import {
  deletePendingClaim,
  getClaimByFid,
  getClaimSeason,
  getClaimStatus,
  getPendingClaim,
  saveActiveClaim,
  type FplClaimRecord,
} from '~/lib/fplClaimServer';
import { BASE_EAS_ADDRESS, FPL_CLAIM_READ_ABI, FPL_CLAIM_SCHEMA_UID } from '~/lib/fplClaimConstants';

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    if (!authUser.fid) return NextResponse.json({ error: 'A verified Farcaster FID is required' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { claimToken?: unknown; attestationUid?: unknown; wallet?: unknown };
    const claimToken = typeof body.claimToken === 'string' ? body.claimToken : '';
    let attestationUid = typeof body.attestationUid === 'string' ? body.attestationUid : '';
    const wallet = typeof body.wallet === 'string' ? body.wallet : '';
    if (attestationUid && !/^0x[0-9a-fA-F]{64}$/.test(attestationUid)) {
      return NextResponse.json({ error: 'A valid attestation UID is required' }, { status: 400 });
    }

    const existing = attestationUid ? await getClaimByFid(getClaimSeason(), authUser.fid) : null;
    if (existing && existing.attestationUid.toLowerCase() === attestationUid.toLowerCase()) {
      return NextResponse.json({ ok: true, claim: existing, attester: existing.wallet });
    }
    const pending = await getPendingClaim(claimToken);

    if (!pending || pending.fid !== authUser.fid || pending.expiresAt < Date.now()) {
      return NextResponse.json({ error: 'Claim authorization expired or unavailable' }, { status: 410 });
    }

    const provider = new JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org', 8453);
    const eas = new Contract(BASE_EAS_ADDRESS, FPL_CLAIM_READ_ABI, provider);
    let recovered = false;
    if (!attestationUid) {
      let checkedWallet: string;
      try {
        checkedWallet = getAddress(wallet);
      } catch {
        return NextResponse.json({ error: 'No recent attestation was supplied for recovery' }, { status: 404 });
      }
      const latestBlock = await provider.getBlockNumber();
      const logs = await provider.getLogs({
        address: BASE_EAS_ADDRESS,
        fromBlock: Math.max(0, latestBlock - 10_000),
        toBlock: latestBlock,
        topics: [
          id('Attested(address,address,bytes32,bytes32)'),
          zeroPadValue(checkedWallet, 32),
          zeroPadValue(checkedWallet, 32),
          FPL_CLAIM_SCHEMA_UID,
        ],
      });
      const eventInterface = new Interface([
        'event Attested(address indexed recipient,address indexed attester,bytes32 uid,bytes32 indexed schemaUID)',
      ]);
      for (const log of logs.reverse()) {
        const parsed = eventInterface.parseLog(log);
        const candidateUid = parsed?.args.uid as string | undefined;
        if (!candidateUid) continue;
        const candidate = await eas.getAttestation(candidateUid);
        const candidateData = AbiCoder.defaultAbiCoder().decode(
          ['uint64', 'uint32', 'uint16', 'bytes32', 'uint8'],
          candidate.data
        );
        if (
          candidate.revocationTime === 0n &&
          candidate.time !== 0n &&
          getAddress(candidate.recipient) === checkedWallet &&
          getAddress(candidate.attester) === checkedWallet &&
          candidateData[0] === BigInt(pending.fid) &&
          candidateData[1] === BigInt(pending.entryId) &&
          candidateData[2] === BigInt(pending.season) &&
          candidateData[4] === 1n
        ) {
          attestationUid = candidateUid;
          recovered = true;
          break;
        }
      }
      if (!attestationUid) {
        return NextResponse.json({ error: 'No recent matching attestation was found' }, { status: 404 });
      }
    }
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
      (!recovered && String(decoded[3]).toLowerCase() !== pending.evidenceHash.toLowerCase()) ||
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
      evidenceHash: String(decoded[3]),
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
