import worldCupMatchesJson from '~/data/worldcup/2026/worldcup.json';
import worldCupTeamsJson from '~/data/worldcup/2026/worldcup.teams.json';
import worldCupStadiumsJson from '~/data/worldcup/2026/worldcup.stadiums.json';

type RawWorldCupMatch = {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
};

type RawWorldCupTeam = {
  name: string;
  name_normalised?: string;
  continent: string;
  flag_icon?: string;
  fifa_code: string;
  group?: string;
  confed?: string;
};

type RawWorldCupStadium = {
  city: string;
  timezone: string;
  cc: string;
  name: string;
  capacity: number;
  coords: string;
};

export type WorldCupTeam = {
  id: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  continent: string;
  flag: string;
  fifaCode: string;
  group: string | null;
  confederation: string | null;
};

export type WorldCupStadium = {
  city: string;
  timezone: string;
  countryCode: string;
  name: string;
  capacity: number;
  coords: string;
};

export type WorldCupMatchSide = {
  name: string;
  normalizedName: string;
  fifaCode: string | null;
  flag: string;
  group: string | null;
  confederation: string | null;
};

export type WorldCupMatch = {
  id: string;
  round: string;
  num: number | null;
  date: string;
  time: string;
  startsAt: string | null;
  group: string | null;
  ground: string;
  stadium: WorldCupStadium | null;
  homeTeam: WorldCupMatchSide;
  awayTeam: WorldCupMatchSide;
};

export type WorldCupGroupKey = string;

type MatchesPayload = {
  name: string;
  matches: RawWorldCupMatch[];
};

type StadiumsPayload = {
  name: string;
  stadiums: RawWorldCupStadium[];
};

export function normalizeWorldCupName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildMatchDateTime(date: string, time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/i);
  if (!match) {
    return null;
  }

  const [, hour, minute, offsetHours] = match;
  const absoluteOffset = Math.abs(Number(offsetHours));
  const offsetSign = Number(offsetHours) >= 0 ? '+' : '-';
  const offset = `${offsetSign}${String(absoluteOffset).padStart(2, '0')}:00`;
  return `${date}T${hour.padStart(2, '0')}:${minute}:00${offset}`;
}

const rawMatches = worldCupMatchesJson as MatchesPayload;
const rawTeams = worldCupTeamsJson as RawWorldCupTeam[];
const rawStadiums = worldCupStadiumsJson as StadiumsPayload;

const teams = rawTeams.map<WorldCupTeam>((team) => {
  const aliases = [
    team.name,
    team.name_normalised,
    team.fifa_code,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeWorldCupName);

  return {
    id: `fifa.world-${team.fifa_code.toLowerCase()}`,
    name: team.name,
    normalizedName: normalizeWorldCupName(team.name),
    aliases: Array.from(new Set(aliases)),
    continent: team.continent,
    flag: team.flag_icon || '🏆',
    fifaCode: team.fifa_code,
    group: team.group || null,
    confederation: team.confed || null,
  };
});

const teamByCode = new Map(teams.map((team) => [team.fifaCode.toLowerCase(), team]));
const teamByAlias = new Map<string, WorldCupTeam>();
for (const team of teams) {
  for (const alias of team.aliases) {
    teamByAlias.set(alias, team);
  }
}

const stadiumByCity = new Map(
  rawStadiums.stadiums.map((stadium) => [
    stadium.city,
    {
      city: stadium.city,
      timezone: stadium.timezone,
      countryCode: stadium.cc.toUpperCase(),
      name: stadium.name,
      capacity: stadium.capacity,
      coords: stadium.coords,
    } satisfies WorldCupStadium,
  ])
);

function buildMatchSide(name: string): WorldCupMatchSide {
  const team = teamByAlias.get(normalizeWorldCupName(name));
  if (!team) {
    return {
      name,
      normalizedName: normalizeWorldCupName(name),
      fifaCode: null,
      flag: '🏆',
      group: null,
      confederation: null,
    };
  }

  return {
    name: team.name,
    normalizedName: team.normalizedName,
    fifaCode: team.fifaCode,
    flag: team.flag,
    group: team.group,
    confederation: team.confederation,
  };
}

export const WORLD_CUP_2026_TEAMS = teams;

export const WORLD_CUP_2026_MATCHES = rawMatches.matches.map<WorldCupMatch>((match) => ({
  id: [
    match.date,
    normalizeWorldCupName(match.team1).replace(/\s+/g, '-'),
    normalizeWorldCupName(match.team2).replace(/\s+/g, '-'),
  ].join('__'),
  round: match.round,
  num: match.num ?? null,
  date: match.date,
  time: match.time,
  startsAt: buildMatchDateTime(match.date, match.time),
  group: match.group || null,
  ground: match.ground,
  stadium: stadiumByCity.get(match.ground) || null,
  homeTeam: buildMatchSide(match.team1),
  awayTeam: buildMatchSide(match.team2),
}));

export function getWorldCupTeamByPreferenceId(teamId: string | null | undefined) {
  if (!teamId) {
    return null;
  }

  const [, code] = teamId.split('-');
  if (!code) {
    return null;
  }

  return teamByCode.get(code.toLowerCase()) || null;
}

export function getWorldCupMatchById(matchId: string | null | undefined) {
  if (!matchId) {
    return null;
  }

  return WORLD_CUP_2026_MATCHES.find((match) => match.id === matchId) || null;
}

export function getWorldCupMatchDays() {
  return Array.from(new Set(WORLD_CUP_2026_MATCHES.map((match) => match.date))).sort((left, right) =>
    left.localeCompare(right)
  );
}

export function getWorldCupMatchesForDate(date: string) {
  return WORLD_CUP_2026_MATCHES
    .filter((match) => match.date === date)
    .sort((left, right) => {
      if (left.startsAt && right.startsAt) {
        return left.startsAt.localeCompare(right.startsAt);
      }

      if (left.startsAt) {
        return -1;
      }

      if (right.startsAt) {
        return 1;
      }

      return left.time.localeCompare(right.time);
    });
}

export function getWorldCupGroupStageDates() {
  return Array.from(
    new Set(
      WORLD_CUP_2026_MATCHES.filter((match) => Boolean(match.group))
        .map((match) => match.date)
    )
  );
}

export function getWorldCupGroups() {
  const groups = new Map<WorldCupGroupKey, WorldCupTeam[]>();

  for (const team of WORLD_CUP_2026_TEAMS) {
    if (!team.group) {
      continue;
    }

    const key = `Group ${team.group}`;
    const existing = groups.get(key) || [];
    existing.push(team);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([group, teams]) => ({
      group,
      teams: teams.sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.group.localeCompare(right.group));
}

export function getRecommendedWorldCupDate(now = new Date()) {
  const days = getWorldCupMatchDays();
  if (days.length === 0) {
    return null;
  }

  const todayKey = now.toISOString().slice(0, 10);
  if (todayKey < days[0]) {
    return days[0];
  }

  if (todayKey > days[days.length - 1]) {
    return days[days.length - 1];
  }

  const sameDay = days.find((day) => day === todayKey);
  if (sameDay) {
    return sameDay;
  }

  return days.find((day) => day > todayKey) || days[0];
}

export function getCountdownToWorldCup(now = new Date()) {
  const kickoff = WORLD_CUP_2026_MATCHES[0]?.startsAt;
  if (!kickoff) {
    return null;
  }

  const diffMs = new Date(kickoff).getTime() - now.getTime();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
