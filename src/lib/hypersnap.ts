const DEFAULT_HYPERSNAP_BASE_URL = 'https://haatz.quilibrium.com';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getHypersnapBaseUrl(): string {
  const envValue =
    process.env.HYPERSNAP_BASE_URL ||
    process.env.NEXT_PUBLIC_HYPERSNAP_BASE_URL ||
    DEFAULT_HYPERSNAP_BASE_URL;

  return trimTrailingSlash(envValue);
}

export interface HypersnapUser {
  fid: number;
  username?: string;
  display_name?: string;
  displayName?: string;
  pfp_url?: string;
  follower_count?: number;
  following_count?: number;
  verifications?: string[];
  verified_addresses?: {
    eth_addresses?: string[];
    sol_addresses?: string[];
  };
  viewer_context?: {
    following?: boolean;
  };
  profile?: {
    bio?: {
      text?: string;
    };
  };
}

export interface HypersnapPagedUsersResponse {
  users: HypersnapUser[];
  next?: {
    cursor?: string | null;
  };
}

export interface HypersnapConversationCast {
  hash: string;
  text?: string;
  timestamp?: string | number;
  author?: HypersnapUser;
}

export interface HypersnapConversationNode {
  cast: HypersnapConversationCast;
  replies?: HypersnapConversationNode[];
}

export interface HypersnapConversationResponse {
  conversation?: HypersnapConversationNode;
  cast?: HypersnapConversationCast;
  replies?: HypersnapConversationNode[];
}

async function fetchHypersnapJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getHypersnapBaseUrl()}${path}`, {
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HyperSnap request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchUsersByAddresses(addresses: string[]): Promise<Record<string, HypersnapUser[]>> {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return {};
  }

  const normalized = addresses.map((address) => address.toLowerCase()).join(',');
  return fetchHypersnapJson<Record<string, HypersnapUser[]>>(
    `/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(normalized)}`
  );
}

export async function fetchUsersByFids(fids: number[]): Promise<HypersnapUser[]> {
  if (!Array.isArray(fids) || fids.length === 0) {
    return [];
  }

  const response = await fetchHypersnapJson<{ users?: HypersnapUser[] }>(
    `/v2/farcaster/user/bulk?fids=${encodeURIComponent(fids.join(','))}`
  );

  return Array.isArray(response.users) ? response.users : [];
}

export async function fetchUserByFid(fid: number): Promise<HypersnapUser | null> {
  if (!Number.isFinite(fid) || fid <= 0) {
    return null;
  }

  const users = await fetchUsersByFids([fid]);
  return users[0] ?? null;
}

export async function fetchFollowingPage(
  fid: number,
  cursor?: string | null,
  limit = 100
): Promise<HypersnapPagedUsersResponse> {
  const params = new URLSearchParams({
    fid: String(fid),
    limit: String(limit),
  });

  if (cursor) {
    params.set('cursor', cursor);
  }

  return fetchHypersnapJson<HypersnapPagedUsersResponse>(`/v2/farcaster/user/following?${params.toString()}`);
}

export async function fetchFollowersPage(
  fid: number,
  cursor?: string | null,
  limit = 100
): Promise<HypersnapPagedUsersResponse> {
  const params = new URLSearchParams({
    fid: String(fid),
    limit: String(limit),
  });

  if (cursor) {
    params.set('cursor', cursor);
  }

  return fetchHypersnapJson<HypersnapPagedUsersResponse>(`/v2/farcaster/user/followers?${params.toString()}`);
}

export async function fetchCastConversation(
  identifier: string,
  type: 'hash' | 'url' = 'hash',
  replyDepth = 2
): Promise<HypersnapConversationResponse> {
  const params = new URLSearchParams({
    identifier,
    type,
    reply_depth: String(replyDepth),
  });

  return fetchHypersnapJson<HypersnapConversationResponse>(`/v2/farcaster/cast/conversation?${params.toString()}`);
}
