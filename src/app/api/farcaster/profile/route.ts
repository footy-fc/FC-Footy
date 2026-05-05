import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { signFootyUserData } from '~/lib/farcaster/footySignerServer';
import { normalizeProfileText, normalizeUsernameInput, validateBioInput, validateDisplayNameInput, validatePfpUrlInput, validateUsernameInput } from '~/lib/farcaster/profileValidation';
import { getSignerSecret, getUserFarcasterAccount, upsertUserFarcasterAccount } from '~/lib/farcaster/store';
import { formatFarcasterError, getFarcasterErrorStatus, submitSignedMessageToHaatz } from '~/lib/farcaster/submitMessage';

type ProfileUpdatePayload = {
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
};

function normalizeUsername(value?: string) {
  const normalized = normalizeUsernameInput(value);
  if (!normalized) {
    return null;
  }
  return normalized;
}

function normalizeOptionalString(value?: string) {
  const normalized = normalizeProfileText(value);
  return normalized.length > 0 ? normalized : null;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const body = (await request.json().catch(() => ({}))) as ProfileUpdatePayload;
    const account = await getUserFarcasterAccount(authUser.userId);

    if (!account?.signerPublicKey) {
      return NextResponse.json({ error: 'No Footy signer is available for this account' }, { status: 400 });
    }

    const encryptedPrivateKey = await getSignerSecret(authUser.userId, account.signerPublicKey);
    if (!encryptedPrivateKey) {
      return NextResponse.json({ error: 'Missing Footy signer secret' }, { status: 400 });
    }

    const username = normalizeUsername(body.username);
    const displayName = normalizeOptionalString(body.displayName);
    const pfpUrl = normalizeOptionalString(body.pfpUrl);
    const bio = normalizeOptionalString(body.bio);

    if (username) {
      return NextResponse.json(
        { error: username.endsWith('.eth') ? 'Use the dedicated username claim flow for .eth names.' : 'Use the dedicated fname claim flow for Farcaster usernames.' },
        { status: 400 }
      );
    }

    if (displayName) {
      const validation = validateDisplayNameInput(displayName);
      if (validation.error) {
        throw new Error(validation.error);
      }
    }

    if (pfpUrl) {
      const validation = validatePfpUrlInput(pfpUrl);
      if (validation.error) {
        throw new Error(validation.error);
      }
    }

    if (bio) {
      const validation = validateBioInput(bio);
      if (validation.error) {
        throw new Error(validation.error);
      }
    }

    const updates = [
      username ? { type: 'username' as const, value: username } : null,
      displayName ? { type: 'display' as const, value: displayName } : null,
      pfpUrl ? { type: 'pfp' as const, value: pfpUrl } : null,
      bio ? { type: 'bio' as const, value: bio } : null,
    ].filter((value): value is { type: 'username' | 'display' | 'pfp' | 'bio'; value: string } => Boolean(value));

    if (updates.length === 0) {
      return NextResponse.json({ error: 'At least one profile field is required' }, { status: 400 });
    }

    for (const update of updates) {
      try {
        const message = await signFootyUserData(account, encryptedPrivateKey, update);
        await submitSignedMessageToHaatz(message);
      } catch (error) {
        const label =
          update.type === 'display'
            ? 'display name'
            : update.type === 'pfp'
              ? 'profile picture'
              : update.type === 'bio'
                ? 'bio'
                : 'username';
        throw new Error(`Failed to save ${label}: ${formatFarcasterError(error)}`);
      }
    }

    const nextAccount = await upsertUserFarcasterAccount({
      ...account,
      username: username ?? account.username ?? null,
      displayName: displayName ?? account.displayName ?? null,
      pfpUrl: pfpUrl ?? account.pfpUrl ?? null,
      bio: bio ?? account.bio ?? null,
    });

    return NextResponse.json({ ok: true, account: nextAccount });
  } catch (error) {
    const message = formatFarcasterError(error);
    return NextResponse.json({ error: message }, { status: getFarcasterErrorStatus(error) });
  }
}

export const runtime = 'nodejs';
