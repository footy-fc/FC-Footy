import {
  Player,
  Team,
  SummaryData,
  Event,
} from './interfaces';
import formatSummaryDataToPrompt from './formatDataForAi';
import sendOpenAi from './sendOpenAi';

// FPL API Types
interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
  team_division: string | null;
  team_region: string | null;
  code: number;
}

interface FPLPlayer {
  id: number;
  web_name: string;
  goals_scored: number;
  assists: number;
  form: string;
  expected_goals: string;
  team: number;
  total_points: number;
  points_per_game: string;
  selected_by_percent: string;
  now_cost: number;
  status: string;
  chance_of_playing_next_round: number | null;
  element_type: number;
  first_name: string;
  second_name: string;
  news: string;
  news_added: string | null;
  transfers_in_event: number;
  transfers_out_event: number;
  value_form: string;
  value_season: string;
  cost_change_event: number;
  cost_change_event_fall: number;
  cost_change_start: number;
  cost_change_start_fall: number;
  dreamteam_count: number;
  in_dreamteam: boolean;
  minutes: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  starts: number;
  expected_goals_per_90: string;
  saves_per_90: string;
  expected_assists: string;
  expected_assists_per_90: string;
  expected_goal_involvements: string;
  expected_goal_involvements_per_90: string;
  expected_goals_conceded: string;
  expected_goals_conceded_per_90: string;
  goals_conceded_per_90: string;
  now_cost_rank: number;
  now_cost_rank_type: number;
  form_rank: number;
  form_rank_type: number;
  points_per_game_rank: number;
  points_per_game_rank_type: number;
  selected_rank: number;
  selected_rank_type: number;
  starts_per_90: string;
  clean_sheets_per_90: string;
}

interface FPLRuleOverride {
  squad_squadsize?: number;
  squad_total_spend?: number;
  squad_team_limit?: number;
  squad_player_limit?: number;
  // Index signature allows for dynamic FPL rule additions
  [key: string]: number | string | boolean | undefined;
}

interface FPLScoringOverride {
  // Index signature allows for dynamic FPL scoring modifications
  [key: string]: number | string | boolean | undefined;
}

interface FPLChipOverride {
  rules: FPLRuleOverride;
  scoring: FPLScoringOverride;
  element_types: number[];
  pick_multiplier: number | null;
}

interface FPLChip {
  id: number;
  name: string;
  number: number;
  start_event: number;
  stop_event: number;
  chip_type: string;
  overrides: FPLChipOverride;
}

interface FPLChipPlay {
  chip_name: string;
  num_played: number;
}

interface FPLTopElementInfo {
  id: number;
  points: number;
}

interface FPLEvent {
  id: number;
  name: string;
  deadline_time: string;
  release_time: string | null;
  average_entry_score: number;
  finished: boolean;
  data_checked: boolean;
  highest_scoring_entry: number;
  deadline_time_epoch: number;
  deadline_time_game_offset: number;
  highest_score: number;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  cup_leagues_created: boolean;
  h2h_ko_matches_created: boolean;
  can_enter: boolean;
  can_manage: boolean;
  released: boolean;
  ranked_count: number;
  overrides: FPLChipOverride;
  chip_plays: FPLChipPlay[];
  most_selected: number;
  most_transferred_in: number;
  top_element: number;
  top_element_info: FPLTopElementInfo;
  transfers_made: number;
  most_captained: number;
  most_vice_captained: number;
}

interface FPLGameSettings {
  league_join_private_max: number;
  league_join_public_max: number;
  league_max_size_public_classic: number;
  league_max_size_public_h2h: number;
  league_max_size_private_h2h: number;
  league_max_ko_rounds_private_h2h: number;
  league_prefix_public: string;
  league_points_h2h_win: number;
  league_points_h2h_lose: number;
  league_points_h2h_draw: number;
  league_ko_first_instead_of_random: boolean;
  cup_start_event_id: number;
  cup_stop_event_id: number;
  cup_qualifying_method: string;
  cup_type: string;
  squad_squadplay: number;
  squad_squadsize: number;
  squad_team_limit: number;
  squad_total_spend: number;
  ui_currency_multiplier: number;
  ui_use_special_shirts: boolean;
  ui_special_shirt_exclusions: string[];
  stats_form_days: number;
  sys_vice_captain_enabled: boolean;
  transfers_cap: number;
  transfers_sell_on_fee: number;
  league_h2h_tiebreak_stats: string[];
  timezone: string;
}

interface FPLPhase {
  id: number;
  name: string;
  start_event: number;
  stop_event: number;
}

interface FPLElementStat {
  label: string;
  name: string;
}

interface FPLElementType {
  id: number;
  plural_name: string;
  plural_name_short: string;
  singular_name: string;
  singular_name_short: string;
  squad_select: number;
  squad_min_play: number;
  squad_max_play: number;
  ui_shirt_specific: boolean;
  sub_positions_locked: number[];
  element_count: number;
}

interface FPLBootstrapData {
  teams: FPLTeam[];
  elements: FPLPlayer[];
  events: FPLEvent[];
  chips: FPLChip[];
  game_settings: FPLGameSettings;
  phases: FPLPhase[];
  total_players: number;
  element_stats: FPLElementStat[];
  element_types: FPLElementType[];
}

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

  console.log('RAGameContext called with:', { eventId, tournament, competitors });

  const fetchBootstrapData = async (): Promise<{ teams: Team[]; elements: Player[] } | null> => {
    try {
      // Try the official FPL API first
      console.log('Fetching FPL data from official API...');
      const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      
      if (fplResponse.ok) {
        console.log('Successfully fetched from FPL API');
        const fplData: FPLBootstrapData = await fplResponse.json();
        
        // Transform FPL data to match our expected format
        const transformedData = {
          teams: fplData.teams.map((team: FPLTeam) => ({
            id: team.id,
            name: team.name,
            short_name: team.short_name,
            players: []
          })),
          elements: fplData.elements.map((player: FPLPlayer) => ({
            web_name: player.web_name,
            goals_scored: player.goals_scored,
            assists: player.assists,
            form: parseFloat(player.form) || 0,
            expected_goals: parseFloat(player.expected_goals) || 0,
            team: player.team,
            // Add additional useful fields
            total_points: player.total_points,
            points_per_game: parseFloat(player.points_per_game) || 0,
            selected_by_percent: parseFloat(player.selected_by_percent) || 0,
            now_cost: player.now_cost,
            status: player.status,
            chance_of_playing_next_round: player.chance_of_playing_next_round
          }))
        };
        
        return transformedData;
      } else {
        console.log('FPL API failed, falling back to Supabase...');
        // Fallback to Supabase
        const response = await fetch(bootstrapUrl);
        return response.json();
      }
    } catch (error) {
      console.error('Error fetching bootstrap data:', error);
      console.log('Falling back to Supabase...');
      try {
        const response = await fetch(bootstrapUrl);
        return response.json();
      } catch (fallbackError) {
        console.error('Supabase fallback also failed:', fallbackError);
        return null;
      }
    }
  };

  const fetchEventData = async (
    eventId: string,
    tournament: string,
    competitors: string
  ): Promise<string | null> => {
    const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${tournament}/scoreboard`;
    const summaryUrl = (eventId: string) => `https://site.api.espn.com/apis/site/v2/sports/soccer/${tournament}/summary?event=${eventId}`;

    console.log('Fetching event data from:', scoreboardUrl);

    try {
      const scoreboardResponse = await fetch(scoreboardUrl);
      console.log('Scoreboard response status:', scoreboardResponse.status);
      
      if (!scoreboardResponse.ok) {
        console.error('Scoreboard API failed:', scoreboardResponse.status, scoreboardResponse.statusText);
        return null;
      }
      
      const scoreboardData = await scoreboardResponse.json();
      const events: Event[] = scoreboardData.events;

      const matchingEvent = events.find((event) => event.id === eventId);
      console.log('Looking for event ID:', eventId, 'Found:', !!matchingEvent, 'Total events:', events.length);

      if (matchingEvent) {
        let summaryData: SummaryData;
        let includeFPL = false;

        if (tournament === "eng.1") {
          console.log("Fetching EPL data with enhanced FPL integration...");
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
            .map((team) => {
              const teamPlayers = matchPlayers.filter((player) => player.team === team.id);
              console.log(`Found ${teamPlayers.length} players for ${team.name} (${team.short_name})`);
              return {
                ...team,
                players: teamPlayers,
              };
            });

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
        console.log("Formatted prompt length:", formattedPrompt.length);
        console.log("Calling sendOpenAi...");
        const aiResponse = await sendOpenAi(formattedPrompt, openAiApiKey);
        console.log("AI response received:", !!aiResponse);
        return aiResponse;
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
    try {
      await sendOpenAi(prefix, openAiApiKey);
      await sendOpenAi('No events found', openAiApiKey);
    } catch (error) {
      console.error('Error clearing context:', error);
    }
  }

  return result;
};

export default RAGameContext;
