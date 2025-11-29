import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

function getUserNotificationDetailsKey(fid: number): string {
  return `fc-footy:user:${fid}`;
}

export type UserNotificationDetails = {
  url: string;
  token: string;
};

export async function getUserNotificationDetails(
  fid: number
): Promise<UserNotificationDetails | null> {
  const res = await redis.get<UserNotificationDetails>(
    getUserNotificationDetailsKey(fid)
  );
  console.log(res);
  return res;
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: UserNotificationDetails
): Promise<void> {
  console.log(notificationDetails,fid);
  await redis.set(getUserNotificationDetailsKey(fid), notificationDetails);
  // Maintain users index set for efficient membership queries
  await redis.sadd("fc-footy:users", fid);
}

export async function deleteUserNotificationDetails(
  fid: number
): Promise<void> {
  await redis.del(getUserNotificationDetailsKey(fid));
  // Keep users index up to date
  await redis.srem("fc-footy:users", fid);
}

export async function getTeamPreferences(fid: string): Promise<string[] | null> {
  try {
    const key = `fc-footy:preference:${fid}`;
    const res = await redis.get<string[]>(key);
    return res || null;
  } catch (error) {
    console.error("Failed to get team preferences:", error);
    return null;
  }
}

// Batch fetch user notification details for many FIDs in a single roundtrip
export async function getUserNotificationDetailsMany(
  fids: number[]
): Promise<Map<number, UserNotificationDetails>> {
  const out = new Map<number, UserNotificationDetails>();
  if (!fids.length) return out;

  // Build keys and pipeline
  const keys = fids.map((fid) => getUserNotificationDetailsKey(fid));
  const pipe = redis.pipeline();
  for (const key of keys) pipe.get<UserNotificationDetails | null>(key);

  const results = await pipe.exec();

  // Upstash pipeline returns array of results in order
  results.forEach((val, idx) => {
    let data: unknown = val as unknown;
    // Handle possible wrapped shapes
    if (data && typeof data === "object") {
      if ("data" in (data as any)) data = (data as any).data;
      if ("result" in (data as any)) data = (data as any).result;
    }
    if (data && typeof data === "object") {
      const parsed = data as UserNotificationDetails;
      if (parsed && typeof parsed.url === "string" && typeof parsed.token === "string") {
        out.set(fids[idx], parsed);
      }
    }
  });

  return out;
}
