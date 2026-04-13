import { fetchUsersByAddresses } from '~/lib/hypersnap';

/**
 * Utility functions for fetching Farcaster profile data using the HyperSnap API.
 */

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp: {
    url: string;
  };
  profile: {
    bio: {
      text: string;
    };
  };
  followerCount: number;
  followingCount: number;
  activeStatus: string;
  verifications: string[];
}

/**
 * Fetch Farcaster profile data for an Ethereum address
 * 
 * @param address - The Ethereum address to look up
 * @returns The Farcaster user data or null if not found
 */
export async function fetchFarcasterProfileByAddress(address: string): Promise<FarcasterUser | null> {
  try {
    const normalizedAddress = address.toLowerCase();

    try {
      const responseData = await fetchUsersByAddresses([normalizedAddress]);
      const users = responseData[normalizedAddress];
      if (!users || users.length === 0) {
        return null;
      }

      const userData = users[0];
      return {
        fid: userData.fid,
        username: userData.username || '',
        displayName: userData.display_name || '',
        pfp: {
          url: userData.pfp_url || ''
        },
        profile: {
          bio: {
            text: userData.profile?.bio?.text || ''
          }
        },
        followerCount: userData.follower_count || 0,
        followingCount: userData.following_count || 0,
        activeStatus: 'active',
        verifications: userData.verifications || userData.verified_addresses?.eth_addresses || []
      };
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Get a default profile picture URL for addresses without Farcaster profiles
 * 
 * @returns A URL to the default avatar
 */
export function getDefaultProfilePicture(): string {
  // Use the defifa_spinner.gif as the default avatar
  return '/defifa_spinner.gif';
} 
