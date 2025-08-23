import { RichMatchEvent, MatchEvent } from '~/types/commentatorTypes';

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
  teams: Team[] = []
): ProcessedMatchData {
  // Extract team names from competitor data (more reliable than parsing shortName)
  const homeTeam = event.competitions[0]?.competitors[0]?.team.abbreviation || 
                   event.shortName.slice(6, 9);
  const awayTeam = event.competitions[0]?.competitors[1]?.team.abbreviation || 
                   event.shortName.slice(0, 3);
  
  const homeScore = event.competitions[0]?.competitors[0]?.score || 0;
  const awayScore = event.competitions[0]?.competitors[1]?.score || 0;
  
  // Derive league/competition
  const leagueId = deriveLeagueId(event, teams);
  
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

export function createMatchEventFromRichData(
  richData: ProcessedMatchData,
  selectedEvent: RichMatchEvent
): MatchEvent {
  const player = selectedEvent.athletesInvolved[0]?.displayName || 'Unknown Player';
  const minute = selectedEvent.clock.displayValue;
  const minuteNum = parseInt(minute.replace("'", "")) || 0;
  const eventType = selectedEvent.type.text.toLowerCase();

  // Determine Drury event type
  let druryEventType: MatchEvent['eventType'] = 'goal';
  if (eventType.includes('red card')) druryEventType = 'red_card';
  else if (eventType.includes('yellow card')) druryEventType = 'yellow_card';
  else if (eventType.includes('penalty')) druryEventType = 'penalty';
  else if (eventType.includes('goal')) druryEventType = 'goal';

  // Create time context
  let timeContext = '';
  if (minuteNum <= 10) timeContext = 'a lightning-fast goal';
  else if (minuteNum <= 30) timeContext = 'a first-half goal';
  else if (minuteNum <= 60) timeContext = 'a second-half goal';
  else timeContext = 'a late goal';

  // Build rich context
  const isGoal = eventType.includes('goal');
  const isRedCard = eventType.includes('red card');
  const contextString = `${player} ${isGoal ? 'scores' : isRedCard ? 'is sent off' : 'receives a booking'} at ${minute}. This is ${timeContext}.`;

  return {
    eventId: richData.eventId,
    homeTeam: richData.homeTeam,
    awayTeam: richData.awayTeam,
    competition: richData.competition,
    eventType: druryEventType,
    player: player,
    minute: minuteNum,
    score: `${richData.homeScore}-${richData.awayScore}`,
    context: contextString,
  };
}

export function findMostSignificantEvent(matchEvents: RichMatchEvent[]): RichMatchEvent | null {
  if (!matchEvents || matchEvents.length === 0) {
    return null;
  }

  // Find the most significant events by parsing type.text
  const significantEvents = matchEvents.filter(event => {
    const eventType = event.type.text.toLowerCase();
    return eventType.includes('goal') || eventType.includes('card') || eventType.includes('penalty');
  });

  if (significantEvents.length === 0) {
    return null;
  }

  // Prioritize goals over cards
  const goals = significantEvents.filter(event => 
    event.type.text.toLowerCase().includes('goal')
  );
  
  return goals.length > 0 ? goals[goals.length - 1] : significantEvents[significantEvents.length - 1];
}
