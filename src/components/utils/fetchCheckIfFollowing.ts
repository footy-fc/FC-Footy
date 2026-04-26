import { fetchFollowersPage, fetchFollowingPage } from '~/lib/hypersnap';

const GRAPH_CACHE_TTL_MS = 60_000;
const followingCache = new Map<number, { expiresAt: number; fids: Set<number> }>();
const followerCache = new Map<number, { expiresAt: number; fids: Set<number> }>();

async function fetchFollowingFids(viewerFid: number): Promise<Set<number>> {
  const cached = followingCache.get(viewerFid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.fids;
  }

  const following = new Set<number>();
  let cursor: string | null | undefined = null;

  do {
    const page = await fetchFollowingPage(viewerFid, cursor ?? null, 100);
    for (const user of page.users || []) {
      following.add(user.fid);
    }
    cursor = page.next?.cursor ?? null;
  } while (cursor);

  followingCache.set(viewerFid, {
    expiresAt: Date.now() + GRAPH_CACHE_TTL_MS,
    fids: following,
  });

  return following;
}

async function fetchFollowerFids(viewerFid: number): Promise<Set<number>> {
  const cached = followerCache.get(viewerFid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.fids;
  }

  const followers = new Set<number>();
  let cursor: string | null | undefined = null;

  do {
    const page = await fetchFollowersPage(viewerFid, cursor ?? null, 100);
    for (const user of page.users || []) {
      followers.add(user.fid);
    }
    cursor = page.next?.cursor ?? null;
  } while (cursor);

  followerCache.set(viewerFid, {
    expiresAt: Date.now() + GRAPH_CACHE_TTL_MS,
    fids: followers,
  });

  return followers;
}

export const fetchCheckIfFollowing = async (
  viewerFid: number,
  targetFid: number
): Promise<boolean> => {
  try {
    const following = await fetchFollowingFids(viewerFid);
    return following.has(targetFid);
  } catch (err) {
    console.error('Error checking follow state:', err);
    return false;
  }
};

export async function fetchMutualFollowers(viewerFid: number, fanFids: number[]): Promise<Record<number, boolean>> {
  const result: Record<number, boolean> = {};
  if (!Array.isArray(fanFids) || fanFids.length === 0) {
    return result;
  }

  try {
    const [following, followers] = await Promise.all([
      fetchFollowingFids(viewerFid),
      fetchFollowerFids(viewerFid),
    ]);

    for (const fanFid of fanFids) {
      result[fanFid] = following.has(fanFid) && followers.has(fanFid);
    }
  } catch (err) {
    console.warn('fetchMutualFollowers: request failed', err);
  }

  return result;
}
