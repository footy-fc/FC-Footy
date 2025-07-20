import { NextRequest } from "next/server";
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
  
  const { adminOnly = false } = await request.json();

  let targetFids: number[];
  
  if (adminOnly) {
    targetFids = ADMIN_FIDS;
  } else {
    // Scan Redis to fetch all user notification keys
    const userKeys = await redis.keys("fc-footy:user:*");
    targetFids = userKeys.map(key => parseInt(key.split(":").pop()!));
  }

  return Response.json({
    success: true,
    userFids: targetFids,
    totalUsers: targetFids.length,
    targetType: adminOnly ? "admins only" : "all users"
  });
}

export const runtime = 'edge'; 