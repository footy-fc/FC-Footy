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

type HubUserDataMessage = {
  data?: {
    userDataBody?: {
      type?: string;
      value?: string;
    };
  };
};

type HubVerificationMessage = {
  data?: {
    verificationAddAddressBody?: {
      address?: string;
      protocol?: string;
    };
  };
};

type UsernameProofRecord = {
  name?: string | number[] | Record<string, number>;
};

export interface FarcasterHubProfilePatch {
  username?: string;
  proofUsername?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  verifications?: string[];
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

function bytesLikeToString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255)) {
    return new TextDecoder().decode(Uint8Array.from(value));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0 && entries.every(([key, entryValue]) => /^\d+$/.test(key) && Number.isInteger(entryValue) && Number(entryValue) >= 0 && Number(entryValue) <= 255)) {
      const sorted = entries.sort(([left], [right]) => Number(left) - Number(right));
      return new TextDecoder().decode(Uint8Array.from(sorted.map(([, entryValue]) => Number(entryValue))));
    }
  }

  return undefined;
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

export async function fetchUserDataMessagesByFid(fid: number): Promise<HubUserDataMessage[]> {
  if (!Number.isFinite(fid) || fid <= 0) {
    return [];
  }

  const response = await fetchHypersnapJson<{ messages?: HubUserDataMessage[] }>(
    `/v1/userDataByFid?fid=${encodeURIComponent(String(fid))}&reverse=true&pageSize=50`
  );

  return Array.isArray(response.messages) ? response.messages : [];
}

export async function fetchVerificationMessagesByFid(fid: number): Promise<HubVerificationMessage[]> {
  if (!Number.isFinite(fid) || fid <= 0) {
    return [];
  }

  const response = await fetchHypersnapJson<{ messages?: HubVerificationMessage[] }>(
    `/v1/verificationsByFid?fid=${encodeURIComponent(String(fid))}&reverse=true&pageSize=50`
  );

  return Array.isArray(response.messages) ? response.messages : [];
}

export async function fetchUsernameProofsByFid(fid: number): Promise<UsernameProofRecord[]> {
  if (!Number.isFinite(fid) || fid <= 0) {
    return [];
  }

  const response = await fetchHypersnapJson<{ proofs?: UsernameProofRecord[] }>(
    `/v1/userNameProofsByFid?fid=${encodeURIComponent(String(fid))}`
  );

  return Array.isArray(response.proofs) ? response.proofs : [];
}

export function deriveHubProfilePatch(
  userDataMessages: HubUserDataMessage[],
  verificationMessages: HubVerificationMessage[],
  usernameProofs: UsernameProofRecord[]
): FarcasterHubProfilePatch {
  const patch: FarcasterHubProfilePatch = {};

  for (const message of userDataMessages) {
    const body = message.data?.userDataBody;
    if (!body?.type || typeof body.value !== 'string') {
      continue;
    }

    if (body.type === 'USER_DATA_TYPE_DISPLAY' && !patch.displayName) {
      patch.displayName = body.value;
    } else if (body.type === 'USER_DATA_TYPE_PFP' && !patch.pfpUrl) {
      patch.pfpUrl = body.value;
    } else if (body.type === 'USER_DATA_TYPE_BIO' && !patch.bio) {
      patch.bio = body.value;
    } else if (body.type === 'USER_DATA_TYPE_USERNAME' && !patch.username) {
      patch.username = body.value;
    }
  }

  const proof = usernameProofs[0];
  const proofName = bytesLikeToString(proof?.name);
  if (proofName && proofName.trim().length > 0) {
    patch.proofUsername = proofName;
  }

  const verifiedAddresses = verificationMessages
    .map((message) => message.data?.verificationAddAddressBody)
    .filter((body): body is NonNullable<HubVerificationMessage['data']>['verificationAddAddressBody'] => Boolean(body?.address))
    .map((body) => body!.address!)
    .filter((address, index, list) => list.findIndex((entry) => entry.toLowerCase() === address.toLowerCase()) === index);

  if (verifiedAddresses.length > 0) {
    patch.verifications = verifiedAddresses;
  }

  return patch;
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
