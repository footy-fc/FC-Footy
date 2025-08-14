import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';

export async function GET(req: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json({ error: 'Missing NEYNAR_API_KEY' }, { status: 500 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const hash = searchParams.get('hash');
    if (!hash) return NextResponse.json({ error: 'hash is required' }, { status: 400 });
    const limit = searchParams.get('limit') || '20';
    const reply_depth = searchParams.get('reply_depth') || '2';
    const viewer_fid = searchParams.get('viewer_fid') || '4163';
    const sort_type = searchParams.get('sort_type') || 'desc_chron';
    const url = `https://api.neynar.com/v2/farcaster/cast/conversation/?reply_depth=${encodeURIComponent(reply_depth)}&limit=${encodeURIComponent(limit)}&identifier=${encodeURIComponent(hash)}&type=hash&viewer_fid=${encodeURIComponent(viewer_fid)}&sort_type=${encodeURIComponent(sort_type)}`;
    const resp = await fetch(url, {
      headers: {
        'x-api-key': NEYNAR_API_KEY,
        'x-neynar-experimental': 'true',
        'accept': 'application/json',
      },
      // @ts-ignore
      cache: 'no-store',
    });
    const json: unknown = await resp.json().catch(() => ({} as unknown));
    const msg =
      json && typeof json === 'object' && 'message' in json && typeof (json as any).message === 'string'
        ? (json as { message: string }).message
        : 'Failed to fetch conversation';

    if (!resp.ok) {
      return NextResponse.json({ error: msg, raw: json }, { status: 500 });
    }
    return NextResponse.json(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch conversation';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const runtime = 'edge';


