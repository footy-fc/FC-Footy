/****
 * Fetch Farcaster user data by addresses using Neynar API.
 * The Neynar `bulk-by-address` endpoint requires a POST request with a JSON body containing the addresses.
 * @param addresses Array of Ethereum addresses.
 * @returns Parsed response JSON from Neynar API.
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

interface NeynarUserResponse {
  users: FarcasterUser[];
}

export async function fetchUsersByAddress(addresses: string[]): Promise<NeynarUserResponse> {
  console.log('fetchUsersByAddress called with addresses:', addresses); // Log the input addresses for debugging
  if (!addresses || addresses.length === 0) {
    return { users: [] };
  }
  const csv = addresses.join(',');
  console.log('fetchUsersByAddress called with CSV string:', csv);
  const query = csv;
  const options = {
    method: 'GET',
    headers: {
      'x-api-key': process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '',
      'x-neynar-experimental': 'false',
    },
  };
  const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${query}`;
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json() as NeynarUserResponse;
  } catch (err) {
    console.error('Failed to fetch users by address:', err);
    throw err;
  }
}