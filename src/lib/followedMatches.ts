export interface FollowedMatchCompetitor {
  team?: {
    abbreviation?: string | null;
  } | null;
}

export interface FollowedMatchEvent {
  competitions?: Array<{
    competitors?: FollowedMatchCompetitor[] | null;
  }> | null;
}

export function normalizeFollowedTeamId(teamId: string): string {
  return teamId.trim().toLowerCase();
}

export function isEventForFollowedTeams(
  event: FollowedMatchEvent,
  league: string,
  followedTeamIds: string[]
): boolean {
  const followed = new Set(followedTeamIds.map(normalizeFollowedTeamId));
  const normalizedLeague = league.trim().toLowerCase();

  return Boolean(event.competitions?.[0]?.competitors?.some((competitor) => {
    const abbreviation = competitor.team?.abbreviation?.trim().toLowerCase();
    return abbreviation ? followed.has(`${normalizedLeague}-${abbreviation}`) : false;
  }));
}
