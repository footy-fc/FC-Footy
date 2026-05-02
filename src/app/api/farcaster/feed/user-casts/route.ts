import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';

export async function GET(request: NextRequest) {
  const fidParam = request.nextUrl.searchParams.get('fid');
  const limitParam = request.nextUrl.searchParams.get('limit');
  const fid = fidParam ? Number(fidParam) : NaN;
  const limit = limitParam ? Number(limitParam) : 15;

  if (!Number.isFinite(fid) || fid <= 0) {
    return NextResponse.json({ error: 'fid is required' }, { status: 400 });
  }

  if (!NEYNAR_API_KEY) {
    return NextResponse.json({ error: 'Missing NEYNAR_API_KEY' }, { status: 500 });
  }

  try {
    const url = new URL('https://api.neynar.com/v2/farcaster/feed/user/casts/');
    url.searchParams.set('fid', String(fid));
    url.searchParams.set('limit', String(Number.isFinite(limit) && limit > 0 ? Math.min(limit, 25) : 15));

    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'x-api-key': NEYNAR_API_KEY,
      },
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => ({}))) as {
      casts?: unknown[];
      result?: {
        casts?: unknown[];
      };
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error || payload.message || 'Failed to fetch user casts' },
        { status: response.status }
      );
    }

    const casts = Array.isArray(payload.casts)
      ? payload.casts
      : Array.isArray(payload.result?.casts)
        ? payload.result.casts
        : [];

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
