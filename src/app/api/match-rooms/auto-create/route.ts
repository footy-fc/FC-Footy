import { NextRequest, NextResponse } from 'next/server';
import { Redis } from "@upstash/redis";
import { sdk } from "@farcaster/miniapp-sdk";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

const MATCH_ROOM_PREFIX = "fc-footy:match-room:";

interface MatchRoomRecord {
  eventId: string;
  parentUrl: string | null;
  castHash: string;
  fid: number | null;
  createdAt: string;
}

function keyForEvent(eventId: string) {
  return `${MATCH_ROOM_PREFIX}${eventId}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, homeTeam, awayTeam, competition, homeScore = 0, awayScore = 0, clock = "Live" } = body;

    if (!eventId || !homeTeam || !awayTeam || !competition) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, homeTeam, awayTeam, competition' },
        { status: 400 }
      );
    }

    // 1. Check if room already exists in KV (admin override)
    // Admin can manually set/override room hashes via the admin dashboard
    const existingRoom = await redis.get(keyForEvent(eventId)) as MatchRoomRecord | null;
    if (existingRoom && existingRoom.castHash) {
      console.log(`🎯 Using existing room for ${eventId}:`, existingRoom.castHash);
      return NextResponse.json({ 
        success: true, 
        castHash: existingRoom.castHash,
        source: 'existing'
      });
    }

    // 2. Create new cast for the match (first share creates the hash)
    console.log(`🎯 Creating new chat room for ${eventId}: ${homeTeam} v ${awayTeam}`);
    
    // Get user context for casting
    const context = await sdk.context;
    const fid = context?.user?.fid;
    
    if (!fid) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Prepare the cast content
    const frameUrlRaw = process.env.NEXT_PUBLIC_BASE_URL || 'https://fc-footy.vercel.app';
    const frameUrl = frameUrlRaw.startsWith('http') ? frameUrlRaw : `https://${frameUrlRaw}`;
    
    // Build the mini app URL
    const search = new URLSearchParams();
    search.set("tab", "matches");
    search.set("eventId", eventId);
    const currentQuery = search.toString() ? `?${search.toString()}` : "";
    const miniAppUrl = `${frameUrl}${currentQuery}`;

    // Build the cast text
    const competitorsLong = `${homeTeam} v ${awayTeam}`;
    const eventStarted = clock !== "Kickoff" && clock !== "TBD";
    const scoreText = eventStarted ? `${homeScore} - ${awayScore}` : 'Kickoff';
    const matchSummary = `${competitorsLong} ${scoreText}\n\n💬 Join the match chat!\n\n@gabedev.eth @kmacb.eth are you in on this one?`;

    const embeds: [] | [string] | [string, string] = [miniAppUrl];

    // 3. Compose the cast
    await sdk.actions.ready({});
    const cast = await sdk.actions.composeCast({ 
      text: matchSummary, 
      embeds, 
      channelKey: 'football' 
    });

    if (!cast || !cast.cast || !cast.cast.hash) {
      throw new Error('Failed to create cast - no hash returned');
    }

    const castHash = cast.cast.hash;
    console.log(`✅ Created new cast for ${eventId}:`, castHash);

    // 4. Save to KV (first-time creation - admin can override later via dashboard)
    const record: MatchRoomRecord = {
      eventId,
      parentUrl: null,
      castHash,
      fid: Number(fid),
      createdAt: new Date().toISOString(),
    };

    await redis.set(keyForEvent(eventId), record);
    console.log(`💾 Saved cast hash to KV for ${eventId} (first-time creation)`);

    return NextResponse.json({ 
      success: true, 
      castHash,
      source: 'new'
    });

  } catch (error) {
    console.error('Error in auto-create match room:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create match room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
