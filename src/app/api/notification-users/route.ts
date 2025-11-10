import { NextRequest } from "next/server";
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
  
  const { adminOnly = false, countOnly = false } = await request.json();

  let targetFids: number[];
  
  if (adminOnly) {
    targetFids = ADMIN_FIDS;
  } else if (countOnly) {
    const total = (await scanKeys(redis as any, "fc-footy:user:*", { count: 1000, limit: 1_000_000 })).length;
    return Response.json({ success: true, userFids: [], totalUsers: total, targetType: "countOnly" });
  } else {
    // Use SCAN to fetch all user notification keys
    const userKeys = await scanKeys(redis as any, "fc-footy:user:*", { count: 1000 });
    targetFids = userKeys.map((key) => parseInt(key.split(":").pop()!));
  }

  return Response.json({
    success: true,
    userFids: targetFids,
    totalUsers: targetFids.length,
    targetType: adminOnly ? "admins only" : "all users"
  });
}

export const runtime = 'edge'; 
