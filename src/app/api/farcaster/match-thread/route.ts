import { NextRequest, NextResponse } from 'next/server';
import { FOOTBALL_PARENT_URL } from '~/lib/farcaster/channels';
import { normalizeFarcasterMessageHash, normalizeFootyShareUrl } from '~/lib/farcaster/shareUrl';
import { fetchParentUrlFeed } from '~/lib/hypersnap';

function getEmbedUrls(cast: { embeds?: Array<{ url?: string }> }) {
  return (cast.embeds || [])
    .map((embed) => embed.url?.trim())
    .filter((value): value is string => Boolean(value));
}

export async function GET(request: NextRequest) {
  const shareUrl = request.nextUrl.searchParams.get('shareUrl');
  const limitParam = Number(request.nextUrl.searchParams.get('limit') || '25');

  if (!shareUrl) {
    return NextResponse.json({ error: 'shareUrl is required' }, { status: 400 });
  }

  const normalizedShareUrl = normalizeFootyShareUrl(shareUrl);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 25;

  try {
    const feed = await fetchParentUrlFeed([FOOTBALL_PARENT_URL], limit);
    const match = feed.casts.find((cast) =>
      getEmbedUrls(cast).some((embedUrl) => normalizeFootyShareUrl(embedUrl) === normalizedShareUrl)
    );

    const normalizedHash = normalizeFarcasterMessageHash(match?.hash);

    if (!match || !match.author?.fid || !normalizedHash) {
      return NextResponse.json({ found: false, parentCast: null });
    }

    return NextResponse.json({
      found: true,
      parentCast: {
        fid: match.author.fid,
        hash: normalizedHash,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to lookup match thread';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
