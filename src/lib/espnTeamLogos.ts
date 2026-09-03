const ESPN_SOCCER_TEAMS_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

const FPL_TO_ESPN_ABBREVIATION: Record<string, string> = {
  MCI: "MNC",
  MUN: "MAN",
};

type TeamForLogoLookup = {
  id: number;
  name: string;
  short_name?: string;
};

type EspnTeam = {
  id?: string;
  displayName?: string;
  abbreviation?: string;
  logo?: string;
  logos?: Array<{ href?: string }>;
};

type EspnTeamsPayload = {
  sports?: Array<{
    leagues?: Array<{
      teams?: Array<{ team?: EspnTeam }>;
    }>;
  }>;
};

export type TeamWithEspnLogo<T extends TeamForLogoLookup> = T & {
  espnId?: string;
  logoUrl?: string;
};

function normalize(value: string | undefined): string {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function getEspnLogoUrl(team: EspnTeam): string | undefined {
  return team.logos?.find((logo) => logo.href)?.href || team.logo;
}

export function enrichTeamsWithEspnLogos<T extends TeamForLogoLookup>(
  teams: T[],
  espnTeams: EspnTeam[]
): Array<TeamWithEspnLogo<T>> {
  const byAbbreviation = new Map<string, EspnTeam>();
  const byName = new Map<string, EspnTeam>();

  for (const team of espnTeams) {
    const abbreviation = normalize(team.abbreviation);
    const name = normalize(team.displayName);

    if (abbreviation) byAbbreviation.set(abbreviation, team);
    if (name) byName.set(name, team);
  }

  return teams.map((team) => {
    const fplAbbreviation = (team.short_name || "").toUpperCase();
    const espnAbbreviation =
      FPL_TO_ESPN_ABBREVIATION[fplAbbreviation] || fplAbbreviation;
    const espnTeam =
      byAbbreviation.get(normalize(espnAbbreviation)) ||
      byName.get(normalize(team.name));
    const logoUrl = espnTeam ? getEspnLogoUrl(espnTeam) : undefined;

    if (!espnTeam || !logoUrl) return { ...team };

    return {
      ...team,
      espnId: espnTeam.id,
      logoUrl,
    };
  });
}

export async function fetchEspnTeamLogos<T extends TeamForLogoLookup>(
  teams: T[],
  leagueId: string,
  fetchImpl: typeof fetch = fetch
): Promise<Array<TeamWithEspnLogo<T>>> {
  const response = await fetchImpl(
    `${ESPN_SOCCER_TEAMS_BASE_URL}/${encodeURIComponent(leagueId)}/teams?limit=100`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    }
  );

  if (!response.ok) {
    throw new Error(`ESPN teams API error: ${response.status}`);
  }

  const payload = (await response.json()) as EspnTeamsPayload;
  const espnTeams =
    payload.sports?.[0]?.leagues?.[0]?.teams
      ?.map((entry) => entry.team)
      .filter((team): team is EspnTeam => Boolean(team)) || [];

  return enrichTeamsWithEspnLogos(teams, espnTeams);
}
