import { NextRequest, NextResponse } from 'next/server';
import { lookupRecentMatchThread } from '~/lib/farcaster/matchThread';

export async function GET(request: NextRequest) {
  const shareUrl = request.nextUrl.searchParams.get('shareUrl');
  const limitParam = Number(request.nextUrl.searchParams.get('limit') || '25');

  if (!shareUrl) {
    return NextResponse.json({ error: 'shareUrl is required' }, { status: 400 });
  }

  try {
    const result = await lookupRecentMatchThread(shareUrl, limitParam);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to lookup match thread';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
