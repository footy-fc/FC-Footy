import { NextRequest, NextResponse } from 'next/server';
import { getHypersnapBaseUrl } from '~/lib/hypersnap';

const FOOTBALL_PARENT_URL = 'chain://eip155:1/erc721:0x7abfe142031532e1ad0e46f971cc0ef7cf4b98b0';

type ParentUrlFeedCast = {
  hash?: string;
  text?: string;
  timestamp?: string;
  author?: {
    fid?: number;
    username?: string;
    display_name?: string;
    pfp_url?: string;
  };
  embeds?: Array<{ url?: string }>;
  parent_hash?: string | null;
  parent_url?: string | null;
  replies?: { count?: number };
  reactions?: {
    likes_count?: number;
    recasts_count?: number;
  };
};

function extractCasts(payload: unknown): ParentUrlFeedCast[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.casts,
    record.messages,
    record.result && typeof record.result === 'object' ? (record.result as Record<string, unknown>).casts : undefined,
    record.result && typeof record.result === 'object' ? (record.result as Record<string, unknown>).messages : undefined,
    record.feed,
    record.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as ParentUrlFeedCast[];
    }
  }

  return [];
}

export async function GET(request: NextRequest) {
  const fidParam = request.nextUrl.searchParams.get('fid');
  const limitParam = request.nextUrl.searchParams.get('limit');
  const fid = fidParam ? Number(fidParam) : NaN;
  const limit = limitParam ? Number(limitParam) : 15;

  if (!Number.isFinite(fid) || fid <= 0) {
    return NextResponse.json({ error: 'fid is required' }, { status: 400 });
  }

  try {
    const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 25) : 15;
    const url = new URL('/v2/farcaster/feed/parent_urls', getHypersnapBaseUrl());
    url.searchParams.set('parent_urls', FOOTBALL_PARENT_URL);
    // Fetch a larger window, then filter by author fid.
    url.searchParams.set('limit', String(Math.max(requestedLimit * 4, 25)));

    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (typeof payload.error === 'string' && payload.error) ||
            (typeof payload.message === 'string' && payload.message) ||
            'Failed to fetch user casts',
        },
        { status: response.status }
      );
    }

    const casts = extractCasts(payload)
      .filter((cast) => cast?.author?.fid === fid)
      .slice(0, requestedLimit);

    return NextResponse.json({
      ok: true,
      casts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user casts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
