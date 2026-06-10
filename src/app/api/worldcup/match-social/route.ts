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
import { getFansForTeamAbbr, getTeamPreferences } from '~/lib/kvPerferences';
import type { RichMatchEvent } from '~/types/commentatorTypes';

type MatchSocialRequest = {
  shareUrl?: string;
  viewerFid?: number;
  selectedMatch?: {
    homeTeam?: string;
    awayTeam?: string;
    homeCode?: string;
    awayCode?: string;
    competition?: string;
    espnEventId?: string;
    matchDate?: string;
    keyMoments?: string[];
    matchEvents?: RichMatchEvent[];
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MatchSocialRequest;
    const shareUrl = body.shareUrl?.trim();
    const selectedMatch = body.selectedMatch;

    if (!shareUrl || !selectedMatch?.homeTeam || !selectedMatch?.awayTeam) {
      return NextResponse.json(
        { error: 'shareUrl, selectedMatch.homeTeam, and selectedMatch.awayTeam are required' },
        { status: 400 }
      );
    }

    const thread = await lookupRecentMatchThread(shareUrl, 25);
    const teamPreferenceIds = buildTeamPreferenceIds({
      competition: selectedMatch.competition,
      homeTeam: selectedMatch.homeTeam,
      awayTeam: selectedMatch.awayTeam,
    });

    const viewerPreferences = body.viewerFid ? await getTeamPreferences(body.viewerFid) : null;
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

    const suggestions = await generateBanterSuggestions({
      homeTeam: selectedMatch.homeTeam,
      awayTeam: selectedMatch.awayTeam,
      competition: selectedMatch.competition,
      viewerAffinity: viewerContext.affinity,
      crowd,
      rootText: thread.rootText,
      hooks,
      keyMoments: selectedMatch.keyMoments,
      espn,
    });

    const [homeFanIds, awayFanIds] = await Promise.all([
      selectedMatch.homeCode ? getFansForTeamAbbr(selectedMatch.homeCode.toLowerCase()) : Promise.resolve([]),
      selectedMatch.awayCode ? getFansForTeamAbbr(selectedMatch.awayCode.toLowerCase()) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      found: thread.found,
      replyParticipants: thread.replyParticipants,
      replyCount: thread.replyCount,
      viewerAffinity: viewerContext.affinity,
      crowd,
      homeFanCount: homeFanIds.length,
      awayFanCount: awayFanIds.length,
      hooks,
      espn,
      suggestions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build World Cup match social context';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
