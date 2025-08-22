/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getUserNotificationDetails } from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifications";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

const ADMIN_FIDS = [420564, 4163];

export async function POST(request: NextRequest) {
  // Validate API key from headers
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const { title, body, targetURL, adminOnly = false, customFids } = await request.json();

  let targetFids: number[];
  
  if (customFids && Array.isArray(customFids)) {
    // Use custom FIDs (e.g., FEPL managers)
    targetFids = customFids;
  } else if (adminOnly) {
    targetFids = ADMIN_FIDS;
  } else {
    // Scan Redis to fetch all user notification keys
    const userKeys = await redis.keys("fc-footy:user:*");
    targetFids = userKeys.map(key => parseInt(key.split(":").pop()!));
  }

  const notificationResults: Array<{ fid: number; result: any }> = [];
  const chunkSize = 35;

  // Process keys in batches of 35
  for (let i = 0; i < targetFids.length; i += chunkSize) {
    const batch = targetFids.slice(i, i + chunkSize);

    // Process the current batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (fid) => {
        try {
          const notificationDetails = await getUserNotificationDetails(fid);
          if (notificationDetails) {
            const result = await sendFrameNotification({ fid, title, body, targetURL });
            return { fid, result };
          } else {
            console.warn(`No notification details found for FID: ${fid}`);
            return { fid, result: "No notification details found" };
          }
        } catch (error) {
          console.error(`Error sending notification to FID: ${fid}`, error);
          return { fid, result: "Error sending notification" };
        }
      })
    );
    notificationResults.push(...batchResults);
  }

  const sentTo = customFids ? "custom FIDs" : adminOnly ? "admins only" : "all users";

  return Response.json({
    success: true,
    notificationResults,
    sentTo,
    totalSent: notificationResults.length
  });
}

export const runtime = 'edge';