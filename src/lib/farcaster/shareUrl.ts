const TRANSIENT_SHARE_PARAMS = new Set([
  'imageKey',
  'imageUrl',
  'homeScore',
  'awayScore',
  'status',
  'isLive',
]);

export function normalizeFootyShareUrl(input: string): string {
  try {
    const url = new URL(input);

    for (const key of TRANSIENT_SHARE_PARAMS) {
      url.searchParams.delete(key);
    }

    const sortedEntries = Array.from(url.searchParams.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    });

    url.search = '';
    for (const [key, value] of sortedEntries) {
      url.searchParams.append(key, value);
    }

    url.hash = '';
    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
    const normalizedSearch = url.searchParams.toString();

    return normalizedSearch ? `${normalizedPath}?${normalizedSearch}` : normalizedPath;
  } catch {
    return input.trim();
  }
}

export function normalizeFarcasterMessageHash(input: string | null | undefined): `0x${string}` | null {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const withPrefix = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{40}$/.test(withPrefix)) {
    return null;
  }

  return withPrefix.toLowerCase() as `0x${string}`;
}
