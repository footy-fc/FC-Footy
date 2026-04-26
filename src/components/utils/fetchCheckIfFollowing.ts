import { fetchFollowersPage, fetchFollowingPage } from '~/lib/hypersnap';

async function fetchFollowingFids(viewerFid: number): Promise<Set<number>> {
  const following = new Set<number>();
  let cursor: string | null | undefined = null;

  do {
    const page = await fetchFollowingPage(viewerFid, cursor ?? null, 100);
    for (const user of page.users || []) {
      following.add(user.fid);
    }
    cursor = page.next?.cursor ?? null;
  } while (cursor);

  return following;
}

async function fetchFollowerFids(viewerFid: number): Promise<Set<number>> {
  const followers = new Set<number>();
  let cursor: string | null | undefined = null;

  do {
    const page = await fetchFollowersPage(viewerFid, cursor ?? null, 100);
    for (const user of page.users || []) {
      followers.add(user.fid);
    }
    cursor = page.next?.cursor ?? null;
  } while (cursor);

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
