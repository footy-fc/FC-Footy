import { NextRequest, NextResponse } from 'next/server';
import { fetchCastConversation } from '~/lib/hypersnap';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hash = searchParams.get('hash');
    const replyDepth = Number(searchParams.get('reply_depth') || '2');

    if (!hash) {
      return NextResponse.json({ error: 'hash is required' }, { status: 400 });
    }

    const json = await fetchCastConversation(hash, 'hash', replyDepth);
    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'edge';
