export async function submitFarcasterMessage(message: unknown) {
  const response = await fetch('/api/farcaster/cast', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error =
      payload && typeof payload === 'object' && 'error' in payload && typeof (payload as Record<string, unknown>).error === 'string'
        ? (payload as Record<string, string>).error
        : 'Failed to submit Farcaster message';

    throw new Error(error);
  }

  return payload;
}
