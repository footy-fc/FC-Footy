import { getLeagueDisplayName, getTeamLogo, teamsByLeague } from "~/components/utils/fetchTeamLogos";
import { isClubTeamId, isCountryTeamId } from "~/lib/kvPerferences";

export type FanclubTeamType = "club" | "country";

export type FanclubTeamRecord = {
  teamId: string;
  name: string;
  abbreviation: string;
  leagueId: string;
  leagueName: string;
  logoUrl: string;
  roomHash: string | null;
  type: FanclubTeamType;
};

export function getFanclubTeams(options?: {
  leagueId?: string | null;
  type?: "club" | "country" | "all";
}): FanclubTeamRecord[] {
  const type = options?.type ?? "club";
  const leagueIdFilter = options?.leagueId?.trim().toLowerCase() || null;
  const teams: FanclubTeamRecord[] = [];

  for (const [leagueId, leagueTeams] of Object.entries(teamsByLeague)) {
    if (leagueIdFilter && leagueId.toLowerCase() !== leagueIdFilter) {
      continue;
    }

    for (const team of leagueTeams) {
      const teamId = `${leagueId}-${team.abbr.toLowerCase()}`;
      const teamType: FanclubTeamType = isCountryTeamId(teamId) ? "country" : "club";

      if (type !== "all" && teamType !== type) {
        continue;
      }

      teams.push({
        teamId,
        name: team.team,
        abbreviation: team.abbr.toLowerCase(),
        leagueId,
        leagueName: getLeagueDisplayName(leagueId),
        logoUrl: getTeamLogo(team.abbr, leagueId),
        roomHash: team.roomHash ?? null,
        type: teamType,
      });
    }
  }

  teams.sort((left, right) => {
    if (left.leagueId !== right.leagueId) {
      return left.leagueId.localeCompare(right.leagueId);
    }

    return left.name.localeCompare(right.name);
  });

  return teams;
}

export function getFanclubTeamById(teamId: string): FanclubTeamRecord | null {
  const normalizedTeamId = teamId.trim().toLowerCase();
  const matches = getFanclubTeams({ type: "all" }).find((team) => team.teamId.toLowerCase() === normalizedTeamId);
  return matches ?? null;
}

export function getFanclubTeamByLeagueAndAbbr(leagueId: string, abbr: string): FanclubTeamRecord | null {
  return getFanclubTeamById(`${leagueId.trim().toLowerCase()}-${abbr.trim().toLowerCase()}`);
}

export function isClubTeam(teamId: string): boolean {
  return isClubTeamId(teamId);
}
