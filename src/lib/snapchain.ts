/**
 * Snapchain Hub HTTP API client
 *
 * Base URL is configurable via NEXT_PUBLIC_SNAPCHAIN_URL.
 * Farcaster epoch: seconds since 2021-01-01T00:00:00Z.
 */

const FARCASTER_EPOCH_MS = 1609459200000;

export function farcasterTimestampToDate(ts: number): Date {
  return new Date(FARCASTER_EPOCH_MS + ts * 1000);
}

export function getSnapchainBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SNAPCHAIN_URL || 'http://153.75.248.217:3381';
  return raw.replace(/\/+$/, '');
}

// ─── Raw Hub message types ────────────────────────────────────────────────────

export interface HubCastEmbed {
  url?: string;
  castId?: { fid: number; hash: string };
}

export interface HubCastAddBody {
  text?: string;
  embeds?: HubCastEmbed[];
  embedsDeprecated?: string[];
  mentions?: number[];
  mentionsPositions?: number[];
  parentUrl?: string;
  parentCastId?: { fid: number; hash: string } | null;
  type?: string;
}

export interface HubMessageData {
  type?: string;
  fid?: number;
  timestamp?: number;
  network?: string;
  castAddBody?: HubCastAddBody;
  userDataBody?: { type?: string; value?: string };
}

export interface HubMessage {
  data?: HubMessageData;
  hash?: string;
  hashScheme?: string;
  signature?: string;
  signatureScheme?: string;
  signer?: string;
}

export interface HubPagedResponse {
  messages?: HubMessage[];
  nextPageToken?: string;
}

export interface ChannelCastPage {
  messages: HubMessage[];
  nextPageToken?: string;
}

// ─── castsByParent ────────────────────────────────────────────────────────────

/**
 * Endpoint: /v1/castsByParent  (NOT castsByParentUrl)
 * Required: fid=1, url=<parent_url>
 */
export async function fetchCastsByParentUrl(
  parentUrl: string,
  options: { pageSize?: number; pageToken?: string; reverse?: boolean } = {}
): Promise<ChannelCastPage> {
  const base = getSnapchainBaseUrl();
  const qs = new URLSearchParams();
  qs.set('fid', '1');
  qs.set('url', parentUrl);
  qs.set('pageSize', String(options.pageSize ?? 25));
  if (options.pageToken) qs.set('pageToken', options.pageToken);
  if (options.reverse !== false) qs.set('reverse', 'true');

  const endpoint = `${base}/v1/castsByParent?${qs.toString()}`;
  const res = await fetch(endpoint, { headers: { accept: 'application/json' }, cache: 'no-store' });

  if (!res.ok) throw new Error(`Snapchain /castsByParent returned ${res.status}`);

  const payload = (await res.json()) as HubPagedResponse;
  return {
    messages: Array.isArray(payload.messages) ? payload.messages : [],
    nextPageToken: payload.nextPageToken,
  };
}

// ─── userDataByFid — author enrichment directly from snapchain ────────────────

export interface SnapchainUserProfile {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

/**
 * Fetch user profile data for one FID from the snapchain node itself.
 * Uses /v1/userDataByFid — same node we're already talking to, so it always
 * works when casts work.
 */
async function fetchUserProfileFromSnapchain(fid: number): Promise<SnapchainUserProfile> {
  const base = getSnapchainBaseUrl();
  const endpoint = `${base}/v1/userDataByFid?fid=${fid}&reverse=true&pageSize=10`;

  try {
    const res = await fetch(endpoint, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return { fid };

    const payload = (await res.json()) as HubPagedResponse;
    const profile: SnapchainUserProfile = { fid };

    for (const msg of payload.messages ?? []) {
      const body = msg.data?.userDataBody;
      if (!body?.value) continue;
      if (body.type === 'USER_DATA_TYPE_USERNAME' && !profile.username) profile.username = body.value;
      else if (body.type === 'USER_DATA_TYPE_DISPLAY' && !profile.displayName) profile.displayName = body.value;
      else if (body.type === 'USER_DATA_TYPE_PFP' && !profile.pfpUrl) profile.pfpUrl = body.value;
    }

    return profile;
  } catch {
    return { fid };
  }
}

/**
 * Batch-fetch user profiles for multiple FIDs from the snapchain node.
 * Fires all requests in parallel via Promise.allSettled so one failure
 * never blocks the others.
 */
export async function fetchUserProfilesFromSnapchain(
  fids: number[]
): Promise<Map<number, SnapchainUserProfile>> {
  const map = new Map<number, SnapchainUserProfile>();
  if (fids.length === 0) return map;

  const results = await Promise.allSettled(fids.map((fid) => fetchUserProfileFromSnapchain(fid)));

  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.fid, result.value);
    }
  }

  return map;
}
