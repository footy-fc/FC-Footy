import { isClubTeamId, isCountryTeamId } from "~/lib/kvPerferences";

export type PreferenceSummary = {
  favoriteTeamIds: string[];
  primaryClubId: string | null;
  primaryCountryId: string | null;
  hasClub: boolean;
  hasCountry: boolean;
};

export function summarizePreferences(favoriteTeamIds: string[] | null | undefined): PreferenceSummary {
  const normalized = Array.isArray(favoriteTeamIds) ? favoriteTeamIds : [];
  const primaryClubId = normalized.find((teamId) => isClubTeamId(teamId)) ?? null;
  const primaryCountryId = normalized.find((teamId) => isCountryTeamId(teamId)) ?? null;

  return {
    favoriteTeamIds: normalized,
    primaryClubId,
    primaryCountryId,
    hasClub: Boolean(primaryClubId),
    hasCountry: Boolean(primaryCountryId),
  };
}
