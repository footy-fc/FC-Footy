import { fetchFollowingPage } from '~/lib/hypersnap';

const GRAPH_CACHE_TTL_MS = 60_000;
const followingCache = new Map<number, { expiresAt: number; fids: Set<number> }>();

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

export async function fetchFollowingStatuses(viewerFid: number, targetFids: number[]): Promise<Record<number, boolean>> {
  const result: Record<number, boolean> = {};
  if (!Array.isArray(targetFids) || targetFids.length === 0) {
    return result;
  }

  try {
    const following = await fetchFollowingFids(viewerFid);

    for (const targetFid of targetFids) {
      result[targetFid] = following.has(targetFid);
    }
  } catch (err) {
    console.warn('fetchFollowingStatuses: request failed', err);
  }

  return result;
}
