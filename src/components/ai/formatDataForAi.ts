import { SummaryData, Standings, GameInfo, Odds, Team } from './interfaces';

/**
 * Constants for keys to include in previews and summaries.
 */
const PREVIEW_KEEP_KEYS: (keyof SummaryData)[] = ['gameInfo', 'standings', 'odds', 'roster'];
const SUMMARY_KEEP_KEYS: (keyof SummaryData)[] = ['keyEvents', 'gameInfo', 'standings'];

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
  if (!Array.isArray(odds) || odds.length === 0) {
    return 'No odds information available.';
  }

  const primaryProvider = odds.find((o) => o.provider.priority === 1) || odds[0];

  const homeMoneyline = parseInt(primaryProvider.homeTeamOdds?.current.moneyLine.alternateDisplayValue ?? "0", 10);
  const awayMoneyline = parseInt(primaryProvider.awayTeamOdds?.current.moneyLine.alternateDisplayValue ?? "0", 10);
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
      .filter((player) => player.form > 6 || player.expected_goals > 0.5)
      .map(
        (player) =>
          `${player.web_name} (Goals: ${player.goals_scored}, Assists: ${player.assists}, Form: ${player.form}, Expected Goals: ${player.expected_goals || 'N/A'})`
      );

    if (keyPlayers.length > 0) {
      analysis.push(`${teamName} Key Players:\n- ${keyPlayers.join('\n- ')}`);
    }
  });

  return analysis.length > 0 ? analysis.join('\n\n') : 'No standout players found for FPL analysis.';
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

  return `
${retrievedText}
Use the retrieved insights and structured data below to provide a concise match summary for the match between ${competitors}. The retrieved insights should be used to enhance and supplement the structured data. If any information seems unclear, mention the uncertainty.

${keyEventsText}

${gameInfoText}

${standingsText}

Summarize the match focusing on key moments, strategies, and standout players. Avoid external links or markdown. Keep concise and under 1200 characters.
  `.trim();
}

export default formatSummaryDataToPrompt;
