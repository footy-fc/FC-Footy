import { NextRequest, NextResponse } from 'next/server';
import {
  buildTeamPreferenceIds,
  classifyMatchAffinity,
  enrichReplyAuthorsWithPreferences,
  extractThreadHooks,
  fetchEspnMatchContext,
  generateBanterSuggestions,
  summarizeCrowdAffinity,
} from '~/lib/farcaster/banter';
import { fetchRecentMatchChannelCasts, lookupRecentMatchThread } from '~/lib/farcaster/matchThread';
import type { RichMatchEvent } from '~/types/match';
import { getTeamPreferences } from '~/lib/kvPerferences';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import {
  getBanterUsageStatus,
  releaseBanterGeneration,
  reserveBanterGeneration,
  type BanterMatchIdentity,
} from '~/lib/farcaster/banterGovernor';

type BanterSuggestionsRequest = {
  shareUrl?: string;
  selectedMatch?: {
    homeTeam?: string;
    awayTeam?: string;
    competition?: string;
    espnEventId?: string;
    matchDate?: string;
    keyMoments?: string[];
    matchEvents?: RichMatchEvent[];
  };
};

function getMatchIdentity(selectedMatch: NonNullable<BanterSuggestionsRequest['selectedMatch']>): BanterMatchIdentity {
  return {
    espnEventId: selectedMatch.espnEventId,
    competition: selectedMatch.competition,
    homeTeam: selectedMatch.homeTeam || '',
    awayTeam: selectedMatch.awayTeam || '',
    matchDate: selectedMatch.matchDate,
  };
}

function noStoreJson(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const url = new URL(request.url);
    const match: BanterMatchIdentity = {
      espnEventId: url.searchParams.get('espnEventId') || undefined,
      competition: url.searchParams.get('competition') || undefined,
      homeTeam: url.searchParams.get('homeTeam') || '',
      awayTeam: url.searchParams.get('awayTeam') || '',
      matchDate: url.searchParams.get('matchDate') || undefined,
    };

    if (!match.homeTeam || !match.awayTeam) {
      return noStoreJson({ error: 'homeTeam and awayTeam are required' }, { status: 400 });
    }

    return noStoreJson(await getBanterUsageStatus(authUser.userId, match));
  } catch (error) {
    return noStoreJson(
      { error: error instanceof Error ? error.message : 'Unable to read banter usage' },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  let reservation:
    | { userId: string; match: BanterMatchIdentity; reservedAt: Date }
    | undefined;

  try {
    const body = (await request.json()) as BanterSuggestionsRequest;
    const shareUrl = body.shareUrl?.trim();
    const selectedMatch = body.selectedMatch;

    if (!shareUrl || !selectedMatch?.homeTeam || !selectedMatch?.awayTeam) {
      return noStoreJson(
        { error: 'shareUrl, selectedMatch.homeTeam, and selectedMatch.awayTeam are required' },
        { status: 400 }
      );
    }

    const authUser = await authenticateFootyUser(request);
    const match = getMatchIdentity(selectedMatch);
    const reservedAt = new Date();
    const usage = await reserveBanterGeneration(authUser.userId, match, reservedAt);
    if (!usage.allowed) {
      return noStoreJson(
        {
          error:
            usage.reason === 'match_limit_reached'
              ? 'AI ideas have already been used for this match today.'
              : 'Your daily AI idea limit has been reached.',
          code: usage.reason,
          usage,
        },
        { status: 429 }
      );
    }
    reservation = { userId: authUser.userId, match, reservedAt };

    const thread = await lookupRecentMatchThread(shareUrl, 25);

    const teamPreferenceIds = buildTeamPreferenceIds({
      competition: selectedMatch.competition,
      homeTeam: selectedMatch.homeTeam,
      awayTeam: selectedMatch.awayTeam,
    });

    const viewerPreferences = authUser.fid ? await getTeamPreferences(authUser.fid) : null;
    const viewerContext = classifyMatchAffinity(viewerPreferences, teamPreferenceIds);

    const enrichedReplies = await enrichReplyAuthorsWithPreferences(thread.directReplies, teamPreferenceIds);
    const crowd = summarizeCrowdAffinity(enrichedReplies);
    const channelCasts = await fetchRecentMatchChannelCasts(shareUrl, 25);
    const hooks = extractThreadHooks({
      replies: enrichedReplies,
      channelCasts,
      homeTeam: selectedMatch.homeTeam,
      awayTeam: selectedMatch.awayTeam,
      keyMoments: selectedMatch.keyMoments,
      matchEvents: selectedMatch.matchEvents,
      rootText: thread.rootText,
    });

    const espn = await fetchEspnMatchContext({
      leagueId: selectedMatch.competition,
      espnEventId: selectedMatch.espnEventId,
      matchDate: selectedMatch.matchDate,
      homeTeam: selectedMatch.homeTeam,
      awayTeam: selectedMatch.awayTeam,
    });

    const generation = await generateBanterSuggestions({
      homeTeam: selectedMatch.homeTeam,
      awayTeam: selectedMatch.awayTeam,
      competition: selectedMatch.competition,
      viewerAffinity: viewerContext.affinity,
      crowd,
      rootText: thread.rootText,
      hooks,
      keyMoments: selectedMatch.keyMoments,
      matchEvents: selectedMatch.matchEvents,
      espn,
    });

    if (generation.source === 'fallback') {
      await releaseBanterGeneration(reservation.userId, reservation.match, reservation.reservedAt);
      reservation = undefined;
      return noStoreJson(
        { error: 'AI ideas are temporarily unavailable.', code: 'generation_unavailable' },
        { status: 503 }
      );
    }

    return noStoreJson({
      found: thread.found,
      viewerAffinity: viewerContext.affinity,
      crowd,
      hooks,
      channelCastCount: channelCasts.length,
      espn,
      suggestions: generation.suggestions,
      generationSource: generation.source,
      usage,
    });
  } catch (error) {
    if (reservation) {
      try {
        await releaseBanterGeneration(reservation.userId, reservation.match, reservation.reservedAt);
      } catch (releaseError) {
        console.error('[banter] Failed to release generation reservation:', releaseError);
      }
    }
    const message = error instanceof Error ? error.message : 'Failed to build banter suggestions';
    const status = /Missing|Invalid|auth|token|user id/i.test(message) ? 401 : 500;
    return noStoreJson({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
