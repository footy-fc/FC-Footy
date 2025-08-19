import { SummaryData, Standings, GameInfo, Odds, Team, Player } from './interfaces';

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
    
    // High confidence picks (form >6, ownership >10%, or high expected stats)
    const highConfidence = players
      .filter((player) => 
        player.form > 6 || 
        (player.selected_by_percent && player.selected_by_percent > 10) ||
        (player.expected_goals && player.expected_goals > 0.3)
      )
      .slice(0, 3)
      .map((player) => ({
        name: player.web_name,
        team: teamName,
        form: player.form,
        ownership: player.selected_by_percent || 0,
        xG: player.expected_goals || 0,
        xA: player.expected_assists || 0,
        risk: player.status === 'a' ? 'Low' : 'Medium'
      }));

    // Differential picks (low ownership, good form)
    const differentials = players
      .filter((player) => 
        (player.selected_by_percent && player.selected_by_percent < 5) &&
        player.form > 4
      )
      .slice(0, 2)
      .map((player) => ({
        name: player.web_name,
        team: teamName,
        form: player.form,
        ownership: player.selected_by_percent || 0,
        xG: player.expected_goals || 0,
        xA: player.expected_assists || 0,
        risk: 'High'
      }));

    if (highConfidence.length > 0) {
      analysis.push(`${teamName} High Confidence: ${highConfidence.map(p => `${p.name} (${p.form} form, ${p.ownership}% owned)`).join(', ')}`);
    }
    
    if (differentials.length > 0) {
      analysis.push(`${teamName} Differentials: ${differentials.map(p => `${p.name} (${p.form} form, ${p.ownership}% owned)`).join(', ')}`);
    }
  });

  return analysis.length > 0 ? analysis.join('\n') : 'No standout players found for FPL analysis.';
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
  console.log('🎯 formatSummaryDataToPrompt called with:', {
    hasSummaryData: !!summaryData,
    competitors,
    includeFPL,
    hasRetrievedInsights: !!retrievedInsights,
    summaryDataKeys: summaryData ? Object.keys(summaryData) : [],
    hasKeyEvents: summaryData?.keyEvents?.length > 0,
    keyEventsCount: summaryData?.keyEvents?.length || 0
  });
  
  const isPreview = !summaryData.keyEvents || summaryData.keyEvents.length === 0;

  const filteredData = isPreview
    ? keepKeys(summaryData, PREVIEW_KEEP_KEYS)
    : keepKeys(summaryData, SUMMARY_KEEP_KEYS);

  const { keyEvents, gameInfo, standings, odds, roster } = filteredData as SummaryData;

  console.log('📊 Prompt Data Analysis:', {
    isPreview,
    hasKeyEvents: !!keyEvents?.length,
    hasGameInfo: !!gameInfo,
    hasStandings: !!standings,
    hasOdds: !!odds?.length,
    hasRoster: !!roster?.length,
    rosterTeamCount: roster?.length || 0,
    rosterPlayerCount: roster?.reduce((total, team) => total + (team.players?.length || 0), 0) || 0
  });

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
**FPL SCORING RULES**
- Goals: FWD 4pts, MID 5pts, DEF/GK 6pts
- Assists: 3pts
- Clean Sheet: DEF/GK 4pts, MID 1pt
- Bonus: Top 3 performers get 3/2/1pts
- Cards: Yellow -1pt, Red -3pts

**FANTASY FOCUS**
- High ownership players (>15%) = High impact
- Form rating >6 = Good pick
- Expected goals/assists >0.3 = High potential
- Low ownership + high form = Differential pick`
      : '';

    return `
${retrievedText}
Use the retrieved insights and structured data below to provide a CONCISE match preview for ${competitors}. Format your response with clear sections and tables where appropriate.

**MATCH PREDICTION**
- Winner: [Team] (Confidence: High/Medium/Low)
- Expected Score: [X-X]
- Key Factors: [List 2-3 main factors]

**FANTASY PICKS**
Format as a table with columns: Player | Team | Form | Ownership% | Expected Points | Risk Level

**TOP PICKS (High Confidence)**
| Player | Team | Form | Ownership% | xG/xA | Risk |
|--------|------|------|------------|-------|------|
[Fill with top 3-4 players]

**DIFFERENTIAL PICKS (Low Ownership)**
| Player | Team | Form | Ownership% | xG/xA | Risk |
|--------|------|------|------------|-------|------|
[Fill with 2-3 differentials]

**CAPTAIN SUGGESTIONS**
1. [Player] - [Reason]
2. [Player] - [Reason]

**MATCH DATA**
${gameInfoText}

${standingsText}

${oddsText}

${rosterAnalysis}

${fplRules}

Keep response under 800 characters. Use tables for data presentation. Focus on actionable Fantasy insights.
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
Use the retrieved insights and structured data below to provide a CONCISE match summary for ${competitors}. Format with tables and clear sections.

**FANTASY PERFORMANCE**
| Player | Team | G | A | Points | Bonus | Status |
|--------|------|---|----|--------|-------|--------|
[Fill with top performers and any disasters - use "GOOD" for performers, "RED CARD" for red cards, "INJURY" for injuries, etc. in Status column]

**KEY EVENTS**
${keyEventsText}

**MATCH DATA**
${gameInfoText}

${standingsText}

${rosterAnalysis}

Keep response under 600 characters. Use tables for data. Focus on Fantasy impact.
  `.trim();
}

export default formatSummaryDataToPrompt;
