interface PinataUserData {
  type: string;
  value: string;
}

interface PinataData {
  userDataBody?: PinataUserData;
}

interface PinataMessage {
  data: PinataData;
}

interface PinataResponse {
  messages: PinataMessage[];
  nextPageToken?: string;
}

/**
 * Fetch and return all user data types and their values for a given FID.
 *
 * @param fanFid - The fan's fid.
 * @returns A record mapping each user data type to an array of its values.
 */
export async function fetchFanUserData(fanFid: number): Promise<Record<string, string[]>> {
  try {
    const response = await fetch(`https://hub.merv.fun/v1/userDataByFid?fid=${fanFid}`, {
      /* headers: {
        "Content-Type": "application/json",
        "api_key": NEYNAR_API_KEY
      } */
    });
    const data: PinataResponse = await response.json();
    // console.log("Data for fid:", fanFid, data);
    if (!data.messages || data.messages.length === 0) {
      return {};
    }
    // Object to store the extracted data types and their corresponding values
    const userDataMap: Record<string, string[]> = {};

    // Iterate through messages to collect user data types and values
    for (const message of data.messages) {
      const userData = message.data.userDataBody;
      if (userData?.type && userData?.value) {
        if (!userDataMap[userData.type]) {
          userDataMap[userData.type] = [];
        }
        userDataMap[userData.type].push(userData.value);
      }
    }
    return userDataMap;
  } catch (error) {
    console.error("Error fetching fan user data for fid:", fanFid, error);
    return {};
  }
}
