/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getUserNotificationDetails } from "~/lib/kv";
import { sendFrameNotification } from "~/lib/notifications";
import { sendFrameNotificationsBatch } from "~/lib/notificationsBatch";
import { Redis } from "@upstash/redis";
import { scanKeys } from "../lib/redisScan";

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
    // Use users index set
    const members: (number | string)[] = await (redis as any).smembers("fc-footy:users");
    targetFids = (Array.isArray(members) ? members : [])
      .map((v) => (typeof v === 'string' ? Number(v) : (v as number)))
      .filter((n) => Number.isFinite(n)) as number[];
  }

  // Use batched sender; it will skip users without tokens
  const { sent, skipped, errors, rateLimited } = await sendFrameNotificationsBatch({
    fids: targetFids,
    title,
    body,
    targetURL,
  });

  const sentTo = customFids ? "custom FIDs" : adminOnly ? "admins only" : "all users";

  return Response.json({
    success: true,
    sentTo,
    totals: { sent, skipped, errors, rateLimited }
  });
}

export const runtime = 'edge';
