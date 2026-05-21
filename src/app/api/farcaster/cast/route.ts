import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { getSignerSecret, getUserFarcasterAccount, appendFarcasterActionLog } from '~/lib/farcaster/store';
import { signFootyCast } from '~/lib/farcaster/footySignerServer';
import { extractSubmissionHash, formatFarcasterError, getFarcasterErrorStatus, submitSignedFarcasterMessage } from '~/lib/farcaster/submitMessage';

type CastSubmitPayload = {
  fid?: number;
  text?: string;
  embeds?: string[];
  parentCast?: {
    fid?: number;
    hash?: string;
  };
  message?: unknown;
};

export async function POST(request: NextRequest) {
  const attemptedAt = new Date().toISOString();
  const body = (await request.json().catch(() => ({}))) as CastSubmitPayload;

  try {
    const authUser = await authenticateFootyUser(request);

    if (!body?.fid || !Number.isFinite(body.fid)) {
      return NextResponse.json({ error: 'fid is required' }, { status: 400 });
    }
    let messageToSubmit = body.message;

    if (!messageToSubmit) {
      const account = await getUserFarcasterAccount(authUser.userId);
      if (!account?.signerPublicKey) {
        return NextResponse.json({ error: 'No Footy signer is available for this account' }, { status: 400 });
      }

      const encryptedPrivateKey = await getSignerSecret(authUser.userId, account.signerPublicKey);
      if (!encryptedPrivateKey) {
        return NextResponse.json({ error: 'Missing Footy signer secret' }, { status: 400 });
      }

      messageToSubmit = await signFootyCast(account, encryptedPrivateKey, {
        text: body.text || '',
        embeds: body.embeds || [],
        parentCast:
          body.parentCast && Number.isFinite(body.parentCast.fid) && typeof body.parentCast.hash === 'string'
            ? {
                fid: Number(body.parentCast.fid),
                hash: body.parentCast.hash as `0x${string}`,
              }
            : undefined,
      });
    }

    const submission = await submitSignedFarcasterMessage(messageToSubmit);
    await appendFarcasterActionLog({
      userId: authUser.userId,
      fid: body.fid,
      runtime: authUser.runtime === 'miniapp' ? 'miniapp' : 'standalone',
      action: 'cast',
      text: body.text || null,
      target: null,
      timestamp: attemptedAt,
      result: 'submitted',
      hash: extractSubmissionHash(submission),
      error: null,
    });

      return NextResponse.json({
      ok: true,
      transport: 'hub-submit',
      result: submission,
    });
  } catch (error) {
    const message = formatFarcasterError(error);
    try {
      const authUser = await authenticateFootyUser(request);
      await appendFarcasterActionLog({
        userId: authUser.userId,
        fid: body?.fid || authUser.fid || 0,
        runtime: authUser.runtime === 'miniapp' ? 'miniapp' : 'standalone',
        action: 'cast',
        text: body?.text || null,
        target: null,
        timestamp: attemptedAt,
        result: null,
        hash: null,
        error: message,
      });
    } catch {
      // Best effort logging only.
    }

    return NextResponse.json({ error: message }, { status: getFarcasterErrorStatus(error) });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
