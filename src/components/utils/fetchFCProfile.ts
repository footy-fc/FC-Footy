import { fetchUsersByFids } from '~/lib/hypersnap';

/**
 * Fetch and return all user data types and their values for a given FID.
 *
 * @param fanFid - The fan's fid.
 * @returns A record mapping each user data type to an array of its values.
 */
export async function fetchFanUserData(fanFid: number): Promise<Record<string, string[]>> {
  try {
    const users = await fetchUsersByFids([fanFid]);
    const user = users[0];
    if (!user) {
      return {};
    }
    const userDataMap: Record<string, string[]> = {};
    const push = (type: string, value?: string | null) => {
      if (!value) return;
      if (!userDataMap[type]) {
        userDataMap[type] = [];
      }
      userDataMap[type].push(value);
    };

    push('USER_DATA_TYPE_USERNAME', user.username || null);
    push('USER_DATA_TYPE_PFP', user.pfp_url || null);
    push('USER_DATA_TYPE_DISPLAY', user.display_name || user.displayName || null);
    push('USER_DATA_TYPE_BIO', user.profile?.bio?.text || null);

    return userDataMap;
  } catch (error) {
    console.error("Error fetching fan user data for fid:", fanFid, error);
    return {};
  }
}

export async function fetchFanUserDataBulk(
  fanFids: number[]
): Promise<Record<number, Record<string, string[]>>> {
  if (!Array.isArray(fanFids) || fanFids.length === 0) {
    return {};
  }

  try {
    const uniqueFids = Array.from(new Set(fanFids.filter((fid) => Number.isFinite(fid) && fid > 0)));
    const users = await fetchUsersByFids(uniqueFids);
    const usersByFid: Record<number, Record<string, string[]>> = {};

    for (const user of users) {
      if (!user?.fid) {
        continue;
      }

      const userDataMap: Record<string, string[]> = {};
      const push = (type: string, value?: string | null) => {
        if (!value) return;
        if (!userDataMap[type]) {
          userDataMap[type] = [];
        }
        userDataMap[type].push(value);
      };

      push('USER_DATA_TYPE_USERNAME', user.username || null);
      push('USER_DATA_TYPE_PFP', user.pfp_url || null);
      push('USER_DATA_TYPE_DISPLAY', user.display_name || user.displayName || null);
      push('USER_DATA_TYPE_BIO', user.profile?.bio?.text || null);

      usersByFid[user.fid] = userDataMap;
    }

    return usersByFid;
  } catch (error) {
    console.error("Error fetching bulk fan user data:", error);
    return {};
  }
}
