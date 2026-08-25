import type { RichMatchEvent } from '~/types/match';

// Team interface to match the one used in MatchEventCard
interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

// Event interface to match the structure used in MatchEventCard
interface MatchEvent_API {
  id: string;
  shortName: string;
  name: string;
  date: string;
  status: { displayClock: string; type: { detail: string } };
  competitions: {
    competitors: {
      team: { logo: string; id: string; abbreviation: string };
      score: number;
    }[];
    details: {
      athletesInvolved: Array<{ displayName: string }>;
      type: { text: string };
      clock: { displayValue: string };
      team: { id: string; abbreviation: string };
    }[];
  }[];
}

export interface ProcessedMatchData {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  eventId: string;
  matchEvents: RichMatchEvent[];
}

export function createRichMatchData(
  event: MatchEvent_API,
  teams: Team[] = [],
  sportId?: string
): ProcessedMatchData {
  // Extract team names from competitor data (more reliable than parsing shortName)
  const homeTeam = event.competitions[0]?.competitors[0]?.team.abbreviation || 
                   event.shortName.slice(6, 9);
  const awayTeam = event.competitions[0]?.competitors[1]?.team.abbreviation || 
                   event.shortName.slice(0, 3);
  
  const homeScore = event.competitions[0]?.competitors[0]?.score || 0;
  const awayScore = event.competitions[0]?.competitors[1]?.score || 0;
  
  // Use sportId if provided, otherwise derive league/competition from teams
  const leagueId = sportId || deriveLeagueId(event, teams);
  
  // Create event ID
  const eventId = `${leagueId.replace('.', '_')}_${homeTeam}_${awayTeam}`;
  
  // Process match events
  const matchEvents = event.competitions[0]?.details || [];
  
  return {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    competition: leagueId,
    eventId,
    matchEvents,
  };
}

export function deriveLeagueId(event: MatchEvent_API, teams: Team[]): string {
  try {
    const homeAbbr = event.competitions[0]?.competitors[0]?.team.abbreviation?.toUpperCase();
    const awayAbbr = event.competitions[0]?.competitors[1]?.team.abbreviation?.toUpperCase();
    return (
      (teams.find((t) => t.abbreviation.toUpperCase() === homeAbbr)?.league) ||
      (teams.find((t) => t.abbreviation.toUpperCase() === awayAbbr)?.league) ||
      'eng.1'
    );
  } catch {
    return 'eng.1';
  }
}
