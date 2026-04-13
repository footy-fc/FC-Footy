import { fetchUsersByAddresses, type HypersnapUser } from '~/lib/hypersnap';

/****
 * Fetch Farcaster user data by addresses using HyperSnap.
 * @param addresses Array of Ethereum addresses.
 * @returns A normalized response shape for existing consumers.
 */
interface FarcasterUser {
  fid: number;
  custody_address: string;
  username: string;
  display_name: string;
  profile: {
    bio: {
      text: string;
    };
    location: {
      place: string;
    };
    avatar_url: string;
  };
  follower_count: number;
  following_count: number;
}

interface UserLookupResponse {
  [address: string]: FarcasterUser[];
}

export async function fetchUsersByAddress(addresses: string[]): Promise<UserLookupResponse> {
  if (!addresses || addresses.length === 0) {
    return {};
  }
  try {
    const response = await fetchUsersByAddresses(addresses);
    const normalized: UserLookupResponse = {};

    for (const [address, users] of Object.entries(response)) {
      normalized[address] = users.map((user: HypersnapUser) => ({
        fid: user.fid,
        custody_address: user.verified_addresses?.eth_addresses?.[0] || '',
        username: user.username || '',
        display_name: user.display_name || '',
        profile: {
          bio: {
            text: user.profile?.bio?.text || '',
          },
          location: {
            place: '',
          },
          avatar_url: user.pfp_url || '',
        },
        follower_count: user.follower_count || 0,
        following_count: user.following_count || 0,
      }));
    }

    return normalized;
  } catch (err) {
    console.error('Failed to fetch users by address:', err);
    throw err;
  }
}
