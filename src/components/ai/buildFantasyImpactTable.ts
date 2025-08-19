import { Player, Team } from './interfaces';

type KeyEventParticipant = string | { displayName?: string; name?: string; text?: string };
interface KeyEvent {
  text?: string;
  team?: { displayName?: string };
  participants?: KeyEventParticipant[];
  clock?: { displayValue?: string };
  period?: { number?: number };
}

interface FantasyImpactRow {
  player: string;
  team: string;
  goals: number;
  assists: number;
  points: number;
  bonus: number;
  status: string;
}

/**
 * Calculate FPL points for a player based on their performance
 */
function calculateFPLPoints(player: Player, keyEvents: KeyEvent[]): { points: number; bonus: number; status: string } {
  let points = 0;
  let bonus = 0;
  let status = 'GOOD';

  // Goals (varies by position, using average)
  points += player.goals_scored * 4;
  
  // Assists
  points += player.assists * 3;
  
  // Clean sheet bonus (if defender/midfielder, estimated)
  // This would need actual match data to be accurate
  
  // Bonus points (estimated based on goals/assists)
  if (player.goals_scored > 0 || player.assists > 0) {
    bonus = Math.min(player.goals_scored + player.assists, 3);
  }

  // Check for red cards, injuries, etc. from key events (null-safe)
  const safeEvents = Array.isArray(keyEvents) ? keyEvents : [];
  const playerEvents = safeEvents.filter((event) => {
    const participants = Array.isArray(event?.participants) ? event.participants : [];
    return participants.some((participant) => {
      // Handle both string and object participants
      let name = '';
      if (typeof participant === 'string') {
        name = participant;
      } else if (participant && typeof participant === 'object') {
        name = participant.displayName || participant.name || participant.text || '';
      }
      return name.toLowerCase().includes((player.web_name || '').toLowerCase());
    });
  });

  for (const event of playerEvents) {
    const eventText = (event.text || '').toLowerCase();
    if (eventText.includes('red card')) {
      status = 'RED CARD';
      points -= 3; // Red card penalty
    } else if (eventText.includes('yellow card')) {
      points -= 1; // Yellow card penalty
      if (status === 'GOOD') status = 'YELLOW CARD';
    } else if (eventText.includes('injury') || eventText.includes('substituted')) {
      if (status === 'GOOD') status = 'INJURY';
    }
  }

  return { points, bonus, status };
}

/**
 * Build fantasy impact table from match data
 */
export function buildFantasyImpactTable(
  roster: Team[], 
  keyEvents: KeyEvent[]
): string {
  if (!roster || roster.length === 0) {
    return 'No fantasy data available.';
  }

  const impactRows: FantasyImpactRow[] = [];
  const safeEvents = Array.isArray(keyEvents) ? keyEvents : [];

  // Process each team's players
  roster.forEach((team) => {
    const players = Array.isArray(team.players) ? team.players : [];
    players.forEach((player) => {
      const { points, bonus, status } = calculateFPLPoints(player, keyEvents);
      
      // Only include players with significant impact (goals, assists, cards, etc.)
      // Also include players mentioned in key events even if no goals/assists
      const hasKeyEventMention = safeEvents.some((event) => {
        const participants = Array.isArray(event?.participants) ? event.participants : [];
        return participants.some((participant) => {
          let name = '';
          if (typeof participant === 'string') {
            name = participant;
          } else if (participant && typeof participant === 'object') {
            name = participant.displayName || participant.name || participant.text || '';
          }
          return name.toLowerCase().includes((player.web_name || '').toLowerCase());
        });
      });
      
      if (player.goals_scored > 0 || player.assists > 0 || status !== 'GOOD' || hasKeyEventMention) {
        impactRows.push({
          player: player.web_name,
          team: team.short_name,
          goals: player.goals_scored,
          assists: player.assists,
          points,
          bonus,
          status,
        });
      }
    });
  });

  // Sort by FPL points (highest first)
  impactRows.sort((a, b) => b.points - a.points);

  // If no significant impact players, return message
  if (impactRows.length === 0) {
    return 'No significant fantasy impact to report.';
  }

  // Build the table rows
  const headers = ['Player', 'Team', 'G', 'A', 'Points', 'Bonus', 'Status'];
  const dataRows = impactRows.map((row) => [
    row.player,
    row.team,
    row.goals.toString(),
    row.assists.toString(),
    row.points.toString(),
    row.bonus.toString(),
    row.status,
  ]);

  // Format as markdown table with proper header separator
  const headerLine = `| ${headers.join(' | ')} |`;
  const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataLines = dataRows.map((row) => `| ${row.join(' | ')} |`);

  return `**FANTASY PERFORMANCE**\n${headerLine}\n${dividerLine}\n${dataLines.join('\n')}`;
}

/**
 * Build complete match summary without AI
 */
export function buildMatchSummary(
  roster: Team[],
  keyEvents: KeyEvent[],
  gameInfo: { venue?: { fullName?: string; address?: { city?: string; country?: string } } } | null | undefined,
): string {
  const fantasyTable = buildFantasyImpactTable(roster, keyEvents);
  
  // Build key events summary (null-safe)
  const safeKeyEvents = Array.isArray(keyEvents) ? keyEvents : [];
  const keyEventsText = safeKeyEvents
    .map((event) => {
      const participantsArr = Array.isArray(event?.participants) ? event.participants : [];
      const participantNames = participantsArr.map((participant) => {
        if (typeof participant === 'string') {
          return participant;
        } else if (participant && typeof participant === 'object') {
          return participant.displayName || participant.name || participant.text || 'Unknown';
        }
        return 'Unknown';
      });
      const participants = participantNames.length > 0 ? participantNames.join(', ') : 'No participants listed';
      const teamName = event?.team?.displayName ?? 'No team information available';
      const time = event?.clock?.displayValue ?? '';
      const period = event?.period?.number ?? '';
      const text = event?.text ?? '';
      return `Event: ${text}\nTeam: ${teamName}\nParticipants: ${participants}\nTime: ${time}\nPeriod: ${period}\n`;
    })
    .join('\n');

  // Build match data
  const matchData = gameInfo?.venue?.fullName 
    ? `Venue: ${gameInfo.venue.fullName}\nLocation: ${gameInfo.venue.address?.city || 'Unknown'}, ${gameInfo.venue.address?.country || 'Unknown'}`
    : 'Venue information not available.';

  return `${fantasyTable}

**KEY EVENTS**
${keyEventsText}

**MATCH DATA**
${matchData}`;
}
