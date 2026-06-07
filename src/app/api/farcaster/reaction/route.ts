/**
 * POST /api/farcaster/reaction
 *
 * Accepts a signed ReactionAdd or ReactionRemove message from the client
 * and submits it to the Farcaster hub via submitSignedFarcasterMessage.
 *
 * Body: { fid: number, message: <signed hub message> }
 *
 * Mirrors /api/farcaster/cast in structure. Auth is optional for reactions
 * since the message is already cryptographically signed by the user's signer.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractSubmissionHash,
  formatFarcasterError,
  getFarcasterErrorStatus,
  submitSignedFarcasterMessage,
} from '~/lib/farcaster/submitMessage';

type ReactionSubmitPayload = {
  fid?: number;
  message?: unknown;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ReactionSubmitPayload;
  try {
    body = (await request.json()) as ReactionSubmitPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.fid || !Number.isFinite(body.fid)) {
    return NextResponse.json({ error: 'fid is required' }, { status: 400 });
  }

  if (!body.message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  try {
    const submission = await submitSignedFarcasterMessage(body.message);
    const hash = extractSubmissionHash(submission);

    return NextResponse.json({
      ok: true,
      hash,
      submission,
    });
  } catch (err) {
    const message = formatFarcasterError(err);
    const status = getFarcasterErrorStatus(err);
    console.error('[reaction/route]', message);
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
