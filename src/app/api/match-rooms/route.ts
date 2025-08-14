import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

const MATCH_ROOM_PREFIX = "fc-footy:match-room:";
// const ADMIN_FIDS = new Set<number>([4163, 420564]);

function keyForEvent(eventId: string) {
  return `${MATCH_ROOM_PREFIX}${eventId}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  // If a specific eventId is provided, return just that room
  if (eventId) {
    const data = await redis.get(keyForEvent(eventId));
    return Response.json({ room: data || null });
  }

  // Otherwise, list all rooms (admin-only via API key)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await redis.keys(`${MATCH_ROOM_PREFIX}*`);
  if (!keys || keys.length === 0) {
    return Response.json({ rooms: [] });
  }
  const rooms = await Promise.all(keys.map((k: string) => redis.get(k)));
  // Sort newest first if createdAt exists
  const normalized = (rooms || [])
    .filter(Boolean)
    .map((r) => r as { createdAt?: string })
    .sort((a, b) => {
      const aT = a?.createdAt ? Date.parse(a.createdAt) : 0;
      const bT = b?.createdAt ? Date.parse(b.createdAt) : 0;
      return bT - aT;
    });
  return Response.json({ rooms: normalized });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const apiKeyValid = apiKey === process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY;
  if (!apiKeyValid) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { eventId, parentUrl, castHash, fid } = body || {};
  if (!eventId) {
    return Response.json({ error: "Missing required field: eventId" }, { status: 400 });
  }
  if (!castHash || typeof castHash !== 'string' || castHash.trim().length === 0) {
    return Response.json({ error: "Missing required field: castHash" }, { status: 400 });
  }
  // With a valid API key, allow creation regardless of fid (admin page may not have frame context)
  // If you want to enforce fid when no API key is present, add a separate branch.

  const record: { eventId: string; parentUrl: string | null; castHash: string; fid: number | null; createdAt: string } = {
    eventId,
    parentUrl: parentUrl || null,
    castHash,
    fid: Number(fid) || null,
    createdAt: new Date().toISOString(),
  };
  await redis.set(keyForEvent(eventId), record);
  return Response.json({ success: true, room: record });
}

export const runtime = 'nodejs';


