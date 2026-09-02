const COUNTRY_LEAGUE_PREFIXES = [
  "fifa.world",
  "fifa.worldq.",
  "caf.nations",
  "uefa.nations",
];

export const TEAM_PREFERENCES_UPDATED_EVENT = "footy:team-preferences-updated";

export function isCountryPreferenceId(teamId: string): boolean {
  const [leagueId] = teamId.split("-");
  return COUNTRY_LEAGUE_PREFIXES.some((prefix) => leagueId.startsWith(prefix));
}

export function isClubPreferenceId(teamId: string): boolean {
  return !isCountryPreferenceId(teamId);
}

export function getPrimaryClubPreference(teamIds: string[]): string | null {
  return teamIds.find(isClubPreferenceId) ?? null;
}

export function makePrimaryClubPreference(teamIds: string[], teamId: string): string[] {
  const unique = Array.from(new Set(teamIds));
  if (!isClubPreferenceId(teamId) || !unique.includes(teamId)) {
    return unique;
  }

  return [teamId, ...unique.filter((id) => id !== teamId)];
}

export function toggleTeamPreference(teamIds: string[], teamId: string): string[] {
  const unique = Array.from(new Set(teamIds));
  if (unique.includes(teamId)) {
    const remaining = unique.filter((id) => id !== teamId);
    const nextPrimaryClub = getPrimaryClubPreference(remaining);
    return nextPrimaryClub
      ? makePrimaryClubPreference(remaining, nextPrimaryClub)
      : remaining;
  }

  const next = [...unique, teamId];
  if (isClubPreferenceId(teamId) && !getPrimaryClubPreference(unique)) {
    return makePrimaryClubPreference(next, teamId);
  }

  return next;
}

export function notifyTeamPreferencesUpdated(fid: number, teamIds: string[]): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(TEAM_PREFERENCES_UPDATED_EVENT, {
      detail: { fid, teamIds },
    })
  );
}
