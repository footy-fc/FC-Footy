// interfaces.ts

export interface KeyEvent {
  text: string;
  team: { displayName: string };
  participants: string[];
  clock: { displayValue: string };
  period: { number: number };
  venue: { fullName: string; address: string };
}

export interface Standings {
  groups: Array<{
    standings: {
      entries: Array<{
        team: string;
        stats: Array<{
          name: string;
          value: number;
        }>;
      }>;
    };
  }>;
}

export interface GameInfo {
  venue?: {
    fullName?: string;
    address?: {
      city?: string;
      country?: string;
    };
  };
  attendance?: number;
  officials?: Array<{
    fullName: string;
  }>;
}

export interface Odds {
  provider: {
    name: string;
    priority: number;
  };
  homeTeamOdds?: {
    current: {
      moneyLine: {
        alternateDisplayValue: string;
      };
    };
  };
  awayTeamOdds?: {
    current: {
      moneyLine: {
        alternateDisplayValue: string;
      };
    };
  };
  drawOdds?: {
    moneyLine: string;
  };
}

export interface Player {
  web_name: string;
  goals_scored: number;
  assists: number;
  form: number;
  expected_goals: number;
  team: number; // Links player to team
  // Additional FPL fields
  total_points?: number;
  points_per_game?: number;
  selected_by_percent?: number;
  now_cost?: number;
  status?: string;
  chance_of_playing_next_round?: number | null;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  players: Player[];
}

export interface SummaryData {
  keyEvents: KeyEvent[];
  gameInfo: GameInfo;
  standings: Standings;
  odds: Odds[];
  roster?: Team[];
}

export interface Event {
  id: string;
  shortName: string;
  name: string;
  date: string;
  status: {
    displayClock: string;
    type: {
      detail: string;
    };
  };
  competitions: {
    competitors: {
      team: {
        logo: string;
        id: string;
        abbreviation: string;
        shortName: string;
      };
      score: number;
    }[];
    details: Detail[];
  }[];
}

export interface Detail {
  athletesInvolved: Array<{ displayName: string }>;
  type: {
    text: string;
  };
  clock: {
    displayValue: string;
  };
  team: {
    id: string;
  };
}
