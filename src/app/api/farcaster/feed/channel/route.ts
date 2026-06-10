/**
 * GET /api/farcaster/feed/channel
 *
 * Fetches casts from a Farcaster channel and returns them enriched with
 * author profiles.
 *
 * Enrichment strategy — tiered, each failure is non-fatal:
 *   1. Hypersnap feed/read path     — preferred for channel surfaces because it
 *      includes reply/reaction counts and richer embed metadata.
 *   2. Snapchain /v1/userDataByFid  — fallback path when Hypersnap is unavailable.
 *
 * Feed strategy — hypersnap first, snapchain fallback:
 *   1. Hypersnap /v2/farcaster/feed/parent_urls
 *   2. Snapchain /v1/castsByParent
 *
 * Query params:
 *   channel   – slug (default: "football")
 *   parentUrl – direct parent URL override
 *   limit     – 1–50 (default 25)
 *   cursor    – pagination token
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCastsByParentUrl,
  fetchUserProfilesFromSnapchain,
  farcasterTimestampToDate,
  type HubMessage,
} from '~/lib/snapchain';
import { fetchUsersByFids, getHypersnapBaseUrl } from '~/lib/hypersnap';
import { FOOTBALL_PARENT_URL } from '~/lib/farcaster/channels';
import type { SocialFeedCast } from '~/components/social/types';

// ─── Channel map ──────────────────────────────────────────────────────────────

const CHANNEL_PARENT_URL_MAP: Record<string, string> = {
  football: FOOTBALL_PARENT_URL,
  soccer:   FOOTBALL_PARENT_URL,
};

// ─── Author enrichment ────────────────────────────────────────────────────────

type AuthorMeta = { username?: string; displayName?: string; pfpUrl?: string };

/**
 * Build an author map for a set of FIDs.
 * Tries snapchain first (guaranteed to work when casts work), then
 * supplements with hypersnap bulk for any gaps. Never throws.
 */
async function buildAuthorMap(fids: number[]): Promise<Map<number, AuthorMeta>> {
  const map = new Map<number, AuthorMeta>();
  if (fids.length === 0) return map;

  // 1. Snapchain userDataByFid — parallel, non-fatal per FID
  try {
    const profiles = await fetchUserProfilesFromSnapchain(fids);
    for (const [fid, p] of profiles) {
      map.set(fid, { username: p.username, displayName: p.displayName, pfpUrl: p.pfpUrl });
    }
  } catch {
    // continue — hypersnap may still fill in
  }

  // 2. Hypersnap bulk — fills FIDs still missing a username
  const missing = fids.filter((fid) => !map.get(fid)?.username);
  if (missing.length > 0) {
    try {
      const users = await fetchUsersByFids(missing);
      for (const u of users) {
        if (!map.get(u.fid)?.username) {
          map.set(u.fid, {
            username: u.username,
            displayName: u.display_name ?? u.displayName,
            pfpUrl: u.pfp_url,
          });
        }
      }
    } catch {
      // best-effort — casts still render, just without usernames for missing FIDs
    }
  }

  return map;
}

// ─── Hub message → SocialFeedCast ────────────────────────────────────────────

function hubMessageToSocialCast(
  msg: HubMessage,
  authors: Map<number, AuthorMeta>
): SocialFeedCast | null {
  const body = msg.data?.castAddBody;
  if (!body) return null;

  const text = body.text?.trim() ?? '';
  const embeds = (body.embeds ?? [])
    .map((e) => ({ url: e.url }))
    .filter((e): e is { url: string } => Boolean(e.url));

  if (!text && embeds.length === 0) return null;

  const fid = msg.data?.fid ?? 0;
  const meta = authors.get(fid);

  return {
    hash: msg.hash ?? '',
    text,
    timestamp:
      typeof msg.data?.timestamp === 'number'
        ? farcasterTimestampToDate(msg.data.timestamp).toISOString()
        : undefined,
    author: {
      fid,
      username: meta?.username,
      display_name: meta?.displayName,
      pfp_url: meta?.pfpUrl,
    },
    embeds,
    parent_hash: null,
    parent_url: body.parentUrl ?? null,
    replies:   { count: 0 },
    reactions: { likes_count: 0, recasts_count: 0 },
  };
}

// ─── Snapchain feed path ──────────────────────────────────────────────────────

async function fetchFromSnapchainPath(
  parentUrl: string,
  limit: number,
  cursor?: string
): Promise<{ casts: SocialFeedCast[]; nextCursor: string | null } | null> {
  try {
    const page = await fetchCastsByParentUrl(parentUrl, {
      pageSize: Math.min(limit + 10, 60),
      pageToken: cursor,
      reverse: true,
    });

    if (page.messages.length === 0) return null;

    const fids = [
      ...new Set(
        page.messages
          .map((m) => m.data?.fid)
          .filter((fid): fid is number => typeof fid === 'number' && fid > 0)
      ),
    ];

    // buildAuthorMap never throws — enrichment failures are non-fatal
    const authors = await buildAuthorMap(fids);

    const casts = page.messages
      .map((m) => hubMessageToSocialCast(m, authors))
      .filter((c): c is SocialFeedCast => c !== null)
      .slice(0, limit);

    return { casts, nextCursor: page.nextPageToken ?? null };
  } catch (err) {
    console.warn('[channel] snapchain path failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Hypersnap fallback path ──────────────────────────────────────────────────

interface HypersnapCast {
  hash?: string;
  text?: string;
  timestamp?: string;
  author?: { fid?: number; username?: string; display_name?: string; pfp_url?: string };
  embeds?: Array<{ url?: string }>;
  parent_hash?: string | null;
  parent_url?: string | null;
  replies?: { count?: number };
  reactions?: { likes_count?: number; recasts_count?: number };
}

function extractHypersnapCasts(payload: unknown): HypersnapCast[] {
  if (!payload || typeof payload !== 'object') return [];
  const rec = payload as Record<string, unknown>;
  for (const key of ['casts', 'messages', 'feed', 'data']) {
    if (Array.isArray(rec[key])) return rec[key] as HypersnapCast[];
  }
  if (rec.result && typeof rec.result === 'object') {
    const r = rec.result as Record<string, unknown>;
    if (Array.isArray(r.casts)) return r.casts as HypersnapCast[];
  }
  return [];
}

function extractNextCursor(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const rec = payload as Record<string, unknown>;
  if (rec.next && typeof rec.next === 'object') {
    const next = rec.next as Record<string, unknown>;
    if (typeof next.cursor === 'string') return next.cursor;
  }
  if (typeof rec.nextPageToken === 'string') return rec.nextPageToken;
  return null;
}

async function fetchFromHypersnapPath(
  parentUrl: string,
  limit: number,
  cursor?: string
): Promise<{ casts: SocialFeedCast[]; nextCursor: string | null }> {
  const base = getHypersnapBaseUrl();
  const url = new URL('/v2/farcaster/feed/parent_urls', base);
  url.searchParams.set('parent_urls', parentUrl);
  url.searchParams.set('limit', String(Math.min(limit + 5, 50)));
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      (typeof payload.error === 'string' && payload.error) ||
      `Hypersnap returned ${res.status}`
    );
  }

  const casts: SocialFeedCast[] = extractHypersnapCasts(payload)
    .filter((c): c is HypersnapCast & { hash: string } => Boolean(c.hash))
    .map((c) => ({
      hash: c.hash!,
      text: c.text ?? '',
      timestamp: c.timestamp,
      author: {
        fid: c.author?.fid ?? 0,
        username: c.author?.username,
        display_name: c.author?.display_name,
        pfp_url: c.author?.pfp_url,
      },
      embeds: (c.embeds ?? []).filter((e) => Boolean(e.url)),
      parent_hash: c.parent_hash ?? null,
      parent_url: c.parent_url ?? null,
      replies: c.replies,
      reactions: c.reactions,
    }))
    .slice(0, limit);

  return { casts, nextCursor: extractNextCursor(payload) };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;

  const channelSlug = params.get('channel') ?? 'football';
  const parentUrlOverride = params.get('parentUrl');
  const limitParam = Number(params.get('limit') ?? '25');
  const cursor = params.get('cursor') ?? undefined;

  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 25;
  const parentUrl = parentUrlOverride ?? CHANNEL_PARENT_URL_MAP[channelSlug] ?? FOOTBALL_PARENT_URL;

  // 1. Hypersnap — preferred for richer feed metadata
  try {
    const result = await fetchFromHypersnapPath(parentUrl, limit, cursor);
    return NextResponse.json({
      ok: true,
      source: 'hypersnap',
      channel: channelSlug,
      casts: result.casts,
      nextCursor: result.nextCursor,
    });
  } catch (hypersnapErr) {
    console.warn('[channel] hypersnap path failed:', hypersnapErr instanceof Error ? hypersnapErr.message : hypersnapErr);
  }

  // 2. Snapchain fallback — casts + author enrichment from same node
  const snapchainResult = await fetchFromSnapchainPath(parentUrl, limit, cursor);
  if (snapchainResult && snapchainResult.casts.length > 0) {
    return NextResponse.json({
      ok: true,
      source: 'snapchain',
      channel: channelSlug,
      casts: snapchainResult.casts,
      nextCursor: snapchainResult.nextCursor,
    });
  }

  return NextResponse.json({ ok: false, error: 'Failed to fetch channel feed' }, { status: 500 });
}

export const runtime = 'nodejs';
