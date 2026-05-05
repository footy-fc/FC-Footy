import { Message, makeMessageHash } from '@farcaster/hub-web';

const HAATZ_SUBMIT_TIMEOUT_MS = 30000;

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

export function reviveUint8Arrays<T>(value: T): T {
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

export function formatFarcasterError(error: unknown): string {
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
    const candidate = [record.error_detail, record.message, record.details, record.error, record.code]
      .find((value) => typeof value === 'string' && value.trim().length > 0);

    if (typeof candidate === 'string') {
      return candidate;
    }

    try {
      return JSON.stringify(record);
    } catch {
      return 'Failed to submit Farcaster message';
    }
  }

  return 'Failed to submit Farcaster message';
}

export function getFarcasterErrorStatus(error: unknown): number {
  const message = formatFarcasterError(error).toLowerCase();

  if (
    message.includes('bad_request') ||
    message.includes('validation_failure') ||
    message.includes('haatz submit failed (400)') ||
    message.includes('failed to submit message')
  ) {
    return 400;
  }

  return 500;
}

export function extractSubmissionHash(submission: unknown): string | null {
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

export async function submitSignedMessageToHaatz(message: unknown) {
  const submitUrl = resolveHaatzSubmitUrl();
  if (!submitUrl) {
    throw new Error('No Farcaster submit transport is configured');
  }

  const normalizedMessage = reviveUint8Arrays(message) as Record<string, unknown> & { data?: unknown; hash?: Uint8Array };
  if (normalizedMessage.data) {
    const hashResult = await makeMessageHash(normalizedMessage.data as Parameters<typeof makeMessageHash>[0]);
    if (hashResult.isOk()) {
      normalizedMessage.hash = hashResult.value;
    }
  }

  const encodedMessage = Message.encode(
    normalizedMessage as unknown as Parameters<typeof Message.encode>[0]
  ).finish();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HAATZ_SUBMIT_TIMEOUT_MS);
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
      },
      body: Buffer.from(encodedMessage),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('[farcaster/submitMessage] haatz submit failed', {
      submitUrl,
      durationMs,
      error: formatFarcasterError(error),
    });

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Haatz submit timed out after ${HAATZ_SUBMIT_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const rawText = await response.text().catch(() => '');
  let payload: unknown = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    console.error('[farcaster/submitMessage] haatz submit rejected', {
      submitUrl,
      status: response.status,
      payload: typeof payload === 'string' ? payload : payload && typeof payload === 'object' ? JSON.stringify(payload) : null,
    });

    if (typeof payload === 'string' && payload.trim().length > 0) {
      throw new Error(`Haatz submit failed (${response.status}): ${payload}`);
    }

    const errorFromObject =
      payload && typeof payload === 'object'
        ? [
            ((payload as Record<string, unknown>).error_detail),
            ((payload as Record<string, unknown>).error),
            ((payload as Record<string, unknown>).message),
            ((payload as Record<string, unknown>).details),
          ]
            .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : null;

    const fallbackPayload =
      payload && typeof payload === 'object'
        ? JSON.stringify(payload)
        : typeof payload === 'string' && payload.trim().length > 0
          ? payload
          : null;

    throw new Error(
      errorFromObject
        ? `Haatz submit failed (${response.status}): ${errorFromObject}`
        : fallbackPayload
          ? `Haatz submit failed (${response.status}): ${fallbackPayload}`
          : `Haatz submit failed (${response.status})`
    );
  }

  console.log('[farcaster/submitMessage] haatz submit ok', {
    submitUrl,
    status: response.status,
    durationMs: Date.now() - startedAt,
  });

  if (typeof payload === 'string' && payload.trim().length > 0) {
    return { ok: true, raw: payload };
  }

  return payload;
}
