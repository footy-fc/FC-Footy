import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';

export async function POST(req: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json({ error: 'Missing NEYNAR_API_KEY' }, { status: 500 });
  }
  try {
    const body = await req.json();
    const { signer_uuid, text } = body || {};
    if (!signer_uuid || !text) {
      return NextResponse.json({ error: 'signer_uuid and text are required' }, { status: 400 });
    }
    const resp = await fetch('https://api.neynar.com/v2/farcaster/cast/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'x-api-key': NEYNAR_API_KEY,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json: unknown = await resp.json().catch(() => ({} as unknown));
    const msg =
      json && typeof json === 'object' && 'message' in json && typeof (json as Record<string, unknown>).message === 'string'
        ? (json as { message: string }).message
        : 'Failed to post cast';

    if (!resp.ok) {
      return NextResponse.json({ error: msg, raw: json }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result: json });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to post cast';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const runtime = 'edge';


