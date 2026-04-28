import { NextRequest, NextResponse } from 'next/server';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import { appendFarcasterActionLog } from '~/lib/farcaster/store';

type CastSubmitPayload = {
  fid?: number;
  text?: string;
  message?: unknown;
};

function isByteObject(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return false;
  }

  return entries.every(([key, entryValue]) => /^\d+$/.test(key) && Number.isInteger(entryValue) && entryValue >= 0 && entryValue <= 255);
}

function reviveUint8Arrays<T>(value: T): T {
  if (value instanceof Uint8Array || value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => reviveUint8Arrays(item)) as T;
  }

  if (isByteObject(value)) {
    const sorted = Object.entries(value).sort(([left], [right]) => Number(left) - Number(right));
    return new Uint8Array(sorted.map(([, entryValue]) => Number(entryValue))) as T;
  }

  if (typeof value === 'object') {
    const nextEntries = Object.entries(value).map(([key, entryValue]) => [key, reviveUint8Arrays(entryValue)]);
    return Object.fromEntries(nextEntries) as T;
  }

  return value;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const hubError = error as Error & { errCode?: string; cause?: unknown };
    const parts = [hubError.errCode, error.message || error.name].filter((value): value is string => Boolean(value && value.trim().length > 0));
    if (parts.length > 0) {
      return parts.join(': ');
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const candidate = [record.message, record.details, record.code]
      .find((value) => typeof value === 'string' && value.trim().length > 0);

    if (typeof candidate === 'string') {
      return candidate;
    }

    try {
      return JSON.stringify(record);
    } catch {
      return 'Failed to submit cast';
    }
  }

  return 'Failed to submit cast';
}

function extractSubmissionHash(submission: unknown): string | null {
  if (!submission || typeof submission !== 'object') {
    return null;
  }

  const record = submission as Record<string, unknown>;
  return typeof record.hash === 'string' ? record.hash : null;
}

function resolveHttpApiBaseUrl() {
  return process.env.FARCASTER_HTTP_API_URL || process.env.HYPERSNAP_SUBMIT_HUB_URL || '';
}

function resolveHaatzSubmitUrl() {
  const baseUrl = resolveHttpApiBaseUrl().replace(/\/$/, '');
  if (!baseUrl) {
    return '';
  }

  if (baseUrl.endsWith('/v1/submitMessage') || baseUrl.endsWith('/submitMessage')) {
    return baseUrl;
  }

  if (baseUrl.endsWith('/v1')) {
    return `${baseUrl}/submitMessage`;
  }

  if (baseUrl.endsWith('/v2')) {
    return `${baseUrl.replace(/\/v2$/, '/v1')}/submitMessage`;
  }

  return `${baseUrl}/v1/submitMessage`;
}

async function submitSignedMessageToHaatz(message: unknown) {
  const submitUrl = resolveHaatzSubmitUrl();
  if (!submitUrl) {
    throw new Error('No Farcaster submit transport is configured');
  }

  const normalizedMessage = reviveUint8Arrays(message);
  const { Message } = await import('@farcaster/hub-web');
  const encodedMessage = Message.encode(
    normalizedMessage as Parameters<typeof Message.encode>[0]
  ).finish();

  const response = await fetch(submitUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
    },
    body: Buffer.from(encodedMessage),
  });

  const rawText = await response.text().catch(() => '');
  let payload: unknown = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    if (typeof payload === 'string' && payload.trim().length > 0) {
      throw new Error(`Haatz submit failed (${response.status}): ${payload}`);
    }

    const errorFromObject =
      payload && typeof payload === 'object'
        ? [((payload as Record<string, unknown>).error), ((payload as Record<string, unknown>).message), ((payload as Record<string, unknown>).details)]
            .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : null;

    throw new Error(errorFromObject ? `Haatz submit failed (${response.status}): ${errorFromObject}` : `Haatz submit failed (${response.status})`);
  }

  if (typeof payload === 'string' && payload.trim().length > 0) {
    return { ok: true, raw: payload };
  }

  return payload;
}

export async function POST(request: NextRequest) {
  const attemptedAt = new Date().toISOString();
  const body = (await request.json().catch(() => ({}))) as CastSubmitPayload;

  try {
    const authUser = await authenticateFootyUser(request);

    if (!body?.fid || !Number.isFinite(body.fid)) {
      return NextResponse.json({ error: 'fid is required' }, { status: 400 });
    }

    if (!body.message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const submission = await submitSignedMessageToHaatz(body.message);
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
    const message = formatError(error);
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

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
