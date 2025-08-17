import { SummaryData, Standings, GameInfo, Odds, Team } from './interfaces';

// Define Player interface locally to avoid circular imports
interface Player {
  web_name: string;
  goals_scored: number;
  assists: number;
  form: number;
  expected_goals: number;
  team: number;
  total_points?: number;
  points_per_game?: number;
  selected_by_percent?: number;
  now_cost?: number;
  status?: string;
  chance_of_playing_next_round?: number | null;
}

/**
 * Constants for keys to include in previews and summaries.
 */
const PREVIEW_KEEP_KEYS: (keyof SummaryData)[] = ['gameInfo', 'standings', 'odds', 'roster'];
const SUMMARY_KEEP_KEYS: (keyof SummaryData)[] = ['keyEvents', 'gameInfo', 'standings', 'roster'];

/**
 * Filters an object to keep only specified keys.
 */
function keepKeys<T extends object>(obj: T, keysToKeep: Array<keyof T>): Partial<T> {
  return keysToKeep.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Partial<T>);
}

/**
 * Formats standings into a readable format.
 */
function extractStandingsInfo(standings: Standings): string {
  if (!Array.isArray(standings.groups)) {
    return 'No standings information available.';
  }

  const standingsInfo: string[] = [];

  standings.groups.forEach((group) => {
    const entries = group.standings?.entries || [];
    entries.forEach((entry) => {
      const teamName = entry.team;
      const rank = entry.stats.find((stat) => stat.name === 'rank')?.value || null;
      const points = entry.stats.find((stat) => stat.name === 'points')?.value || null;

      if (teamName && rank !== null && points !== null) {
        standingsInfo.push(`${rank}. ${teamName} - ${points} points`);
      }
    });
  });

  return standingsInfo.length > 0 ? standingsInfo.join('\n') : 'No standings information available.';
}

/**
 * Formats game information details.
 */
function extractGameInfoDetails(gameInfo: GameInfo): string {
  if (!gameInfo) return 'No additional game information available.';

  const venue = gameInfo.venue
    ? `Venue: ${gameInfo.venue.fullName || 'Unknown Venue'}\nLocation: ${gameInfo.venue.address?.city || 'Unknown City'}, ${gameInfo.venue.address?.country || 'Unknown Country'}`
    : 'Venue information not available.';

  const attendance = gameInfo.attendance ? `Attendance: ${gameInfo.attendance}` : 'Attendance information not available.';
  const officials = Array.isArray(gameInfo.officials) && gameInfo.officials.length > 0
    ? `Officials: ${gameInfo.officials.map((official) => official.fullName).join(', ')}`
    : 'No officials listed.';

  return `${venue}\n${attendance}\n${officials}`.trim();
}

/**
 * Extracts and formats moneyline odds with implied probabilities and vig.
 */
function extractMoneylineOdds(odds: Odds[]): string {
  try {
    if (!Array.isArray(odds) || odds.length === 0) {
      return 'No odds information available.';
    }

    console.log('Processing odds data:', JSON.stringify(odds, null, 2));

    const primaryProvider = odds.find((o) => o.provider.priority === 1) || odds[0];
    
    console.log('Primary provider structure:', JSON.stringify(primaryProvider, null, 2));
    if (primaryProvider?.homeTeamOdds) {
      console.log('Home team odds structure:', JSON.stringify(primaryProvider.homeTeamOdds, null, 2));
    }
    if (primaryProvider?.awayTeamOdds) {
      console.log('Away team odds structure:', JSON.stringify(primaryProvider.awayTeamOdds, null, 2));
    }

    // Check if primaryProvider has the required structure
    if (!primaryProvider || !primaryProvider.homeTeamOdds || !primaryProvider.awayTeamOdds) {
      return 'Odds data structure is incomplete.';
    }

    // Add null checks for moneyLine properties
    const homeMoneyline = parseInt(primaryProvider.homeTeamOdds?.current?.moneyLine?.alternateDisplayValue ?? "0", 10);
    const awayMoneyline = parseInt(primaryProvider.awayTeamOdds?.current?.moneyLine?.alternateDisplayValue ?? "0", 10);
    const drawMoneyline = parseInt(primaryProvider.drawOdds?.moneyLine ?? "0", 10);

  if (isNaN(homeMoneyline) || isNaN(awayMoneyline) || isNaN(drawMoneyline)) {
    return 'Invalid odds data.';
  }

  const calculateImpliedProbability = (moneyline: number): number =>
    moneyline > 0 ? 100 / (moneyline + 100) : Math.abs(moneyline) / (Math.abs(moneyline) + 100);

  const homeProbability = calculateImpliedProbability(homeMoneyline);
  const awayProbability = calculateImpliedProbability(awayMoneyline);
  const drawProbability = calculateImpliedProbability(drawMoneyline);

  const totalProbability = homeProbability + awayProbability + drawProbability;

  const normalize = (probability: number): number => probability / totalProbability;

  const normalizedHome = normalize(homeProbability);
  const normalizedAway = normalize(awayProbability);
  const normalizedDraw = normalize(drawProbability);

  const vig = totalProbability - 1;

  return `
Odds by ${primaryProvider.provider.name}:
- Home Team: ${homeMoneyline} (Implied: ${(normalizedHome * 100).toFixed(2)}%)
- Away Team: ${awayMoneyline} (Implied: ${(normalizedAway * 100).toFixed(2)}%)
- Draw: ${drawMoneyline} (Implied: ${(normalizedDraw * 100).toFixed(2)}%)
Bookmaker's margin (vig): ${(vig * 100).toFixed(2)}%
  `.trim();
  } catch (error) {
    console.error('Error processing odds data:', error);
    return 'Error processing odds information.';
  }
}

/**
 * Analyzes the roster and identifies players likely to earn FPL points.
 */
function analyzeRosterForFPLPoints(roster: Team[]): string {
  if (!Array.isArray(roster) || roster.length === 0) {
    return 'No roster information available.';
  }

  const analysis: string[] = [];

  roster.forEach((team) => {
    const teamName = team.name || 'Unknown Team';
    const players = team.players || [];
    const keyPlayers = players
      .filter((player) => {
        // Filter for players in good form, high expected goals, or high ownership
        return player.form > 6 || 
               player.expected_goals > 0.5 || 
               (player.selected_by_percent && player.selected_by_percent > 10) ||
               (player.points_per_game && player.points_per_game > 5);
      })
      .map(
        (player) => {
          const status = player.status === 'a' ? 'Available' : 
                        player.status === 'i' ? 'Injured' : 
                        player.status === 's' ? 'Suspended' : 
                        player.status === 'u' ? 'Unavailable' : 'Unknown';
          
          const chance = player.chance_of_playing_next_round !== null ? 
                        `${player.chance_of_playing_next_round}% chance` : 'Unknown';
          
          return `${player.web_name} (Goals: ${player.goals_scored}, Assists: ${player.assists}, Form: ${player.form}, Expected Goals: ${player.expected_goals || 'N/A'}, Points: ${player.total_points || 0}, PPG: ${player.points_per_game || 'N/A'}, Ownership: ${player.selected_by_percent || 0}%, Status: ${status}, ${chance})`;
        }
      );

    if (keyPlayers.length > 0) {
      analysis.push(`${teamName} Key Players:\n- ${keyPlayers.join('\n- ')}`);
    }
  });

  return analysis.length > 0 ? analysis.join('\n\n') : 'No standout players found for FPL analysis.';
}

/**
 * Analyzes FPL impact for post-match summaries.
 */
function analyzeFPLImpact(roster: Team[]): string {
  if (!Array.isArray(roster) || roster.length === 0) {
    return 'No FPL data available for impact analysis.';
  }

  const impactAnalysis: string[] = [];

  roster.forEach((team) => {
    const teamName = team.name || 'Unknown Team';
    const players = team.players || [];
    
    // Find players who scored goals or assists (actual performance)
    const performers = players
      .filter((player) => player.goals_scored > 0 || player.assists > 0)
      .map((player) => {
        const fplPoints = calculateFPLPoints(player);
        const ownership = player.selected_by_percent || 0;
        const impact = ownership > 15 ? 'HIGH IMPACT' : ownership > 5 ? 'MEDIUM IMPACT' : 'LOW IMPACT';
        
        return `${player.web_name} (${player.goals_scored}G ${player.assists}A, ${fplPoints} FPL pts, ${ownership}% owned - ${impact})`;
      });

    // Find high-ownership players who didn't perform
    const underperformers = players
      .filter((player) => (player.selected_by_percent || 0) > 15 && player.goals_scored === 0 && player.assists === 0)
      .map((player) => `${player.web_name} (${player.selected_by_percent}% owned, no returns)`);

    if (performers.length > 0) {
      impactAnalysis.push(`${teamName} Performers:\n- ${performers.join('\n- ')}`);
    }
    
    if (underperformers.length > 0) {
      impactAnalysis.push(`${teamName} Underperformers:\n- ${underperformers.join('\n- ')}`);
    }
  });

  return impactAnalysis.length > 0 ? impactAnalysis.join('\n\n') : 'No significant FPL impact to report.';
}

/**
 * Calculate estimated FPL points for a player based on their performance.
 */
function calculateFPLPoints(player: Player): number {
  let points = 0;
  
  // Goals (varies by position, using average)
  points += player.goals_scored * 4;
  
  // Assists
  points += player.assists * 3;
  
  // Clean sheet bonus (if defender/midfielder, estimated)
  // This would need actual match data to be accurate
  
  // Bonus points (estimated based on goals/assists)
  if (player.goals_scored > 0 || player.assists > 0) {
    points += Math.min(player.goals_scored + player.assists, 3);
  }
  
  return points;
}

/**
 * Formats summary data into a prompt for AI.
 */
function formatSummaryDataToPrompt(
  summaryData: SummaryData,
  competitors: string,
  includeFPL: boolean,
  retrievedInsights: string
): string {
  const isPreview = !summaryData.keyEvents || summaryData.keyEvents.length === 0;

  const filteredData = isPreview
    ? keepKeys(summaryData, PREVIEW_KEEP_KEYS)
    : keepKeys(summaryData, SUMMARY_KEEP_KEYS);

  const { keyEvents, gameInfo, standings, odds, roster } = filteredData as SummaryData;

  const retrievedText = retrievedInsights
    ? `Retrieved insights:\n${retrievedInsights}\n`
    : '';

  if (isPreview) {
    const gameInfoText = gameInfo
      ? `Game Information:\n${extractGameInfoDetails(gameInfo)}`
      : 'No additional game information available.';

    const standingsText = standings
      ? `Standings:\n${extractStandingsInfo(standings)}`
      : 'No standings information available.';

    const oddsText = odds
      ? `Odds:\n${extractMoneylineOdds(odds)}`
      : 'No odds information available.';

    const rosterAnalysis = includeFPL && roster
      ? `Roster Analysis:\n${analyzeRosterForFPLPoints(roster)}`
      : 'No roster information available.';
    console.log('Roster Analysis:', rosterAnalysis);
    const fplRules = includeFPL
      ? `
Use the following **Fantasy Premier League (FPL) scoring rules** to identify players who might score a lot of points during the match:
...`
      : '';

    return `
${retrievedText}
Use the retrieved insights and structured data below to provide a detailed match preview for the upcoming match between ${competitors}. The retrieved insights should be used to enhance and supplement the structured data. If any information seems unclear, mention the uncertainty.

${gameInfoText}

${standingsText}

${oddsText}

${rosterAnalysis}

${fplRules}

Discuss likely outcomes based on team strategies, standout players, and other factors influencing the match. Use concise language and avoid past tense.
    `.trim();
  }

  const keyEventsText = keyEvents
    ?.map((event) => {
      const participants = Array.isArray(event.participants) && event.participants.length > 0
        ? event.participants.join(', ')
        : 'No participants listed';

      const teamName = event.team?.displayName ?? 'No team information available';
      return `Event: ${event.text}\nTeam: ${teamName}\nParticipants: ${participants}\nTime: ${event.clock.displayValue}\nPeriod: ${event.period.number}\n`;
    })
    .join('\n') ?? '';

  const standingsText = standings
    ? `Standings:\n${extractStandingsInfo(standings)}`
    : 'No standings information available.';

  const gameInfoText = gameInfo
    ? `Game Information:\n${extractGameInfoDetails(gameInfo)}`
    : 'No additional game information available.';

  const rosterAnalysis = includeFPL && roster
    ? `FPL Impact Analysis:\n${analyzeFPLImpact(roster)}`
    : 'No FPL data available.';

  return `
${retrievedText}
Use the retrieved insights and structured data below to provide a concise match summary for the match between ${competitors}. The retrieved insights should be used to enhance and supplement the structured data. If any information seems unclear, mention the uncertainty.

${keyEventsText}

${gameInfoText}

${standingsText}

${rosterAnalysis}

Summarize the match focusing on key moments, strategies, and standout players. Include FPL impact where relevant (e.g., "Player X scored 2 goals, earning 13 FPL points" or "High-ownership player Y got a red card"). Avoid external links or markdown. Keep concise and under 1200 characters.
  `.trim();
}

export default formatSummaryDataToPrompt;
