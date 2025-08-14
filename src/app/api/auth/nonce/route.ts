// @ts-nocheck
import { NextResponse } from 'next/server';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing NEYNAR_API_KEY' }, { status: 500 });
    const client = new NeynarAPIClient({ apiKey });
    const anyClient = client as unknown as { fetchNonce?: () => Promise<{ nonce?: string }> };
    const response = anyClient.fetchNonce ? await anyClient.fetchNonce() : null;
    if (!response || !response.nonce) {
      return NextResponse.json({ error: 'Failed to fetch nonce' }, { status: 500 });
    }
    return NextResponse.json({ nonce: response.nonce });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch nonce' }, { status: 500 });
  }
}


