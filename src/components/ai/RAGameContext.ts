import {
  Player,
  Team,
  SummaryData,
  Event,
} from './interfaces';
import formatSummaryDataToPrompt from './formatDataForAi';
import sendOpenAi from './sendOpenAi';

// Main Functionality

const RAGameContext = async (
  eventId: string,
  tournament: string,
  competitors: string
): Promise<string | null> => {
  const openAiApiKey = process.env.NEXT_PUBLIC_OPENAIKEY;
  const prefix = "Clear the context history and start over with the following info:";
  const bootstrapUrl = "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/screenshots/bootstrap.json";

  if (!openAiApiKey) {
    console.error('OpenAI API key is missing');
    return null;
  }

  const fetchBootstrapData = async (): Promise<{ teams: Team[]; elements: Player[] } | null> => {
    try {
      const response = await fetch(bootstrapUrl);
      return response.json();
    } catch (error) {
      console.error('Error fetching bootstrap data:', error);
      return null;
    }
  };

  const fetchEventData = async (
    eventId: string,
    tournament: string,
    competitors: string
  ): Promise<string | null> => {
    const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${tournament}/scoreboard`;
    const summaryUrl = (eventId: string) => `https://site.api.espn.com/apis/site/v2/sports/soccer/${tournament}/summary?event=${eventId}`;

    try {
      const scoreboardResponse = await fetch(scoreboardUrl);
      const scoreboardData = await scoreboardResponse.json();
      const events: Event[] = scoreboardData.events;

      const matchingEvent = events.find((event) => event.id === eventId);

      if (matchingEvent) {
        let summaryData: SummaryData;
        let includeFPL = false;

        if (tournament === "eng.1") {
          const bootstrapData = await fetchBootstrapData();
          if (!bootstrapData) {
            console.error("Bootstrap data is unavailable.");
            return null;
          }

          const { teams, elements } = bootstrapData;

          const teamAbbreviations = matchingEvent.competitions[0].competitors.map(
            (c) => c.team.abbreviation
          );

          const matchPlayers = elements.filter((player) => {
            const playerTeam = teams.find((team) => team.id === player.team);
            return playerTeam && teamAbbreviations.includes(playerTeam.short_name);
          });

          const teamInfo = teams
            .filter((team) => teamAbbreviations.includes(team.short_name))
            .map((team) => ({
              ...team,
              players: matchPlayers.filter((player) => player.team === team.id),
            }));

          const summaryResponse = await fetch(summaryUrl(matchingEvent.id));
          summaryData = await summaryResponse.json();
          summaryData.roster = teamInfo;
          includeFPL = true;
        } else {
          const summaryResponse = await fetch(summaryUrl(matchingEvent.id));
          summaryData = await summaryResponse.json();
        }

        const retrievedInsights = ''; // TODO: Replace this with actual RAG data if you have it.
        const formattedPrompt = formatSummaryDataToPrompt(summaryData, competitors, includeFPL, retrievedInsights);
        console.log("Formatted prompt:", formattedPrompt);
        return await sendOpenAi(formattedPrompt, openAiApiKey);
      }

      console.error("No matching event found for event ID:", eventId);
      return null;
    } catch (error) {
      console.error("Error fetching event data:", error);
      return null;
    }
  };

  const result = await fetchEventData(eventId, tournament, competitors);

  if (!result) {
    await sendOpenAi(prefix, openAiApiKey);
    await sendOpenAi('No events found', openAiApiKey);
  }

  return result;
};

export default RAGameContext;
