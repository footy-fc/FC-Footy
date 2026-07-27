import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const FPL_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
const CACHE_TTL_SECONDS = 300;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const redis =
  process.env.NEXT_PUBLIC_KV_REST_API_URL && process.env.NEXT_PUBLIC_KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
        token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
      })
    : null;

interface FplManagerHistoryPayload {
  entryId: number;
  source: 'fpl';
  fetched_at: string;
  data: unknown;
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders,
  });
}

function parseEntryId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const entryId = Number(value);
  if (!Number.isSafeInteger(entryId)) {
    return null;
  }

  return entryId;
}

async function getCachedHistory(cacheKey: string): Promise<FplManagerHistoryPayload | null> {
  if (!redis) {
    return null;
  }

  try {
    return await redis.get<FplManagerHistoryPayload>(cacheKey);
  } catch (error) {
    console.error('❌ Error reading cached FPL manager history:', error);
    return null;
  }
}

async function cacheHistory(cacheKey: string, payload: FplManagerHistoryPayload) {
  if (!redis) {
    return;
  }

  try {
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, payload);
  } catch (error) {
    console.error('❌ Error caching FPL manager history:', error);
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = parseEntryId(searchParams.get('entryId'));

    if (!entryId) {
      return jsonResponse({ error: 'entryId must be a positive integer' }, 400);
    }

    const cacheKey = `fc-footy:fpl-manager-history:${entryId}`;
    const cachedHistory = await getCachedHistory(cacheKey);
    if (cachedHistory) {
      return jsonResponse(cachedHistory);
    }

    const fplUrl = `https://fantasy.premierleague.com/api/entry/${entryId}/history/`;
    const response = await fetch(fplUrl, {
      headers: {
        'User-Agent': FPL_USER_AGENT,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return jsonResponse({ error: `No FPL manager history found for entry ${entryId}` }, 404);
      }

      const errorText = await response.text().catch(() => '');
      console.error(`❌ FPL manager history error ${response.status}:`, errorText);
      return jsonResponse(
        {
          error: 'FPL API error',
          status: response.status,
          details: errorText.slice(0, 500),
        },
        502
      );
    }

    const data = await response.json();
    const payload: FplManagerHistoryPayload = {
      entryId,
      source: 'fpl',
      fetched_at: new Date().toISOString(),
      data,
    };

    await cacheHistory(cacheKey, payload);

    return jsonResponse(payload);
  } catch (error) {
    console.error('❌ Unexpected error fetching FPL manager history:', error);
    return jsonResponse({ error: 'Failed to fetch FPL manager history' }, 500);
  }
}
