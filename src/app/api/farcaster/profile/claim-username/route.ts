import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getFidCustodyAddress, signFootyUserData } from '~/lib/farcaster/footySignerServer';
import { normalizeUsernameInput, validateUsernameInput } from '~/lib/farcaster/profileValidation';
import { formatFarcasterError, getFarcasterErrorStatus, submitSignedMessageToHaatz } from '~/lib/farcaster/submitMessage';
import { getSignerSecret, getUserFarcasterAccount, upsertUserFarcasterAccount } from '~/lib/farcaster/store';

type UsernameClaimPayload = {
  username?: string;
  owner?: string;
  timestamp?: number;
  signature?: string;
};

const DEFAULT_FNAME_REGISTRY_URL = 'https://fnames.farcaster.xyz';
const DEFAULT_HUB_HTTP_URL = 'https://haatz.quilibrium.com';

function getFnameRegistryUrl() {
  return (process.env.FARCASTER_FNAME_REGISTRY_URL || DEFAULT_FNAME_REGISTRY_URL).replace(/\/+$/, '');
}

function getHubHttpUrl() {
  return (process.env.FARCASTER_HTTP_API_URL || process.env.HYPERSNAP_SUBMIT_HUB_URL || DEFAULT_HUB_HTTP_URL).replace(/\/+$/, '');
}

type UsernameProofLookup = {
  timestamp?: number;
  name?: string;
  owner?: string;
  fid?: number;
  type?: string;
};

type UsernameProofsByFidResponse = {
  proofs?: UsernameProofLookup[];
};

const FNAME_CHANGE_COOLDOWN_SECONDS = 28 * 24 * 60 * 60;

async function fetchUsernameProofByName(name: string): Promise<UsernameProofLookup | null> {
  const response = await fetch(`${getHubHttpUrl()}/v1/userNameProofByName?name=${encodeURIComponent(name)}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as UsernameProofLookup | null;
}

async function fetchUsernameProofsByFid(fid: number): Promise<UsernameProofLookup[]> {
  const response = await fetch(`${getHubHttpUrl()}/v1/userNameProofsByFid?fid=${encodeURIComponent(String(fid))}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json().catch(() => null)) as UsernameProofsByFidResponse | null;
  return Array.isArray(payload?.proofs) ? payload.proofs : [];
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const body = (await request.json().catch(() => ({}))) as UsernameClaimPayload;
    const account = await getUserFarcasterAccount(authUser.userId);

    if (!account?.fid) {
      return NextResponse.json({ error: 'No Farcaster account is available for this user' }, { status: 400 });
    }

    const username = normalizeUsernameInput(body.username);
    const validation = validateUsernameInput(username);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (validation.normalized.endsWith('.eth')) {
      return NextResponse.json(
        { error: 'Claiming .eth usernames is not wired into Footy yet. Use Farcaster mobile for now.' },
        { status: 400 }
      );
    }

    const owner = typeof body.owner === 'string' ? body.owner.toLowerCase() : '';
    const custodyAddress = (account.custodyAddress || (await getFidCustodyAddress(account.fid).catch(() => ''))).toLowerCase();
    if (!custodyAddress) {
      return NextResponse.json({ error: 'No Farcaster custody address is available for this account' }, { status: 400 });
    }

    if (!owner || owner !== custodyAddress) {
      return NextResponse.json({ error: 'Username claim must be signed by the Farcaster custody wallet' }, { status: 400 });
    }

    if (typeof body.signature !== 'string' || !body.signature.startsWith('0x')) {
      return NextResponse.json({ error: 'A valid username claim signature is required' }, { status: 400 });
    }

    if (!Number.isInteger(body.timestamp) || Number(body.timestamp) <= 0) {
      return NextResponse.json({ error: 'A valid username claim timestamp is required' }, { status: 400 });
    }
    const claimTimestamp = Number(body.timestamp);

    const [existingProof, fidProofs] = await Promise.all([
      fetchUsernameProofByName(validation.normalized),
      fetchUsernameProofsByFid(account.fid),
    ]);

    const currentProof = fidProofs.find((proof) => typeof proof.name === 'string' && proof.name.trim().length > 0) || null;
    const currentProofName = typeof currentProof?.name === 'string' ? currentProof.name : null;
    const isRename = Boolean(currentProofName && currentProofName !== validation.normalized);

    if (isRename && typeof currentProof?.timestamp === 'number') {
      const earliestAllowedTimestamp = currentProof.timestamp + FNAME_CHANGE_COOLDOWN_SECONDS;
      if (claimTimestamp < earliestAllowedTimestamp) {
        const nextDate = new Date(earliestAllowedTimestamp * 1000).toISOString();
        return NextResponse.json(
          {
            error: `Username claim failed: You can only change an fname once every 28 days. This account can change names again after ${nextDate}.`,
          },
          { status: 400 }
        );
      }
    }

    const proofAlreadyMatches =
      existingProof?.name === validation.normalized &&
      existingProof?.fid === account.fid &&
      typeof existingProof.owner === 'string' &&
      existingProof.owner.toLowerCase() === owner;

    if (!proofAlreadyMatches) {
      const transferResponse = await fetch(`${getFnameRegistryUrl()}/transfers`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: isRename ? account.fid : 0,
          to: account.fid,
          name: validation.normalized,
          owner,
          timestamp: claimTimestamp,
          signature: body.signature,
        }),
        cache: 'no-store',
      });

      const rawText = await transferResponse.text().catch(() => '');
      let payload: unknown = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = rawText;
      }

      if (!transferResponse.ok) {
        const details =
          typeof payload === 'string' && payload.trim().length > 0
            ? payload
            : payload && typeof payload === 'object'
              ? [((payload as Record<string, unknown>).error), ((payload as Record<string, unknown>).message), ((payload as Record<string, unknown>).details)]
                  .find((value): value is string => typeof value === 'string' && value.trim().length > 0) || JSON.stringify(payload)
              : `Fname registry request failed (${transferResponse.status})`;

        return NextResponse.json({ error: `Username claim failed: ${details}` }, { status: 400 });
      }
    }

    if (account.signerPublicKey) {
      const encryptedPrivateKey = await getSignerSecret(authUser.userId, account.signerPublicKey);
      if (encryptedPrivateKey) {
        const usernameMessage = await signFootyUserData(account, encryptedPrivateKey, {
          type: 'username',
          value: validation.normalized,
        });
        await submitSignedMessageToHaatz(usernameMessage);
      }
    }

    const nextAccount = await upsertUserFarcasterAccount({
      ...account,
      username: validation.normalized,
      custodyAddress,
    });

    return NextResponse.json({ ok: true, account: nextAccount });
  } catch (error) {
    const message = formatFarcasterError(error);
    return NextResponse.json({ error: message }, { status: getFarcasterErrorStatus(error) });
  }
}

export const runtime = 'nodejs';
