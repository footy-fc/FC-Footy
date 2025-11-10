// Lightweight fetch helpers for Edge runtime with retries and timeouts
export type RetryOptions = {
  retries?: number;
  timeoutMs?: number;
  backoffMs?: number;
};

export async function fetchJSONWithRetry<T = unknown>(
  url: string,
  { retries = 3, timeoutMs = 8000, backoffMs = 500 }: RetryOptions = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(id);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as T;
      return data;
    } catch (err) {
      clearTimeout(id);
      lastErr = err;
      // Jittered backoff
      const wait = backoffMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to fetch JSON');
}

export function okJson(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...init,
  });
}

export function errorAsOk(message: string, extra?: Record<string, unknown>) {
  return okJson({ success: false, error: message, ...(extra ?? {}) });
}

