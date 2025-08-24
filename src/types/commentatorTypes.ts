export interface CommentatorQuote {
  id: string;
  quote: string;
  event: string;
  competition: string;
  teams: string[];
  player?: string;
  context: string;
  tags: string[];
  metaphors?: string[];
  source_confidence?: 'high' | 'medium' | 'low';
}

export interface MatchEvent {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  player?: string;
  eventType: 'goal' | 'assist' | 'red_card' | 'yellow_card' | 'substitution' | 'final_whistle' | 'penalty' | 'free_kick' | 'chat_commentary';
  minute?: number;
  score?: string;
  context?: string;
  // Additional fields for chat commentary
  chatHistory?: string;
  userCount?: number;
  activeUsers?: string[];
  matchEvents?: Array<{
    type?: { text?: string };
    athletesInvolved?: Array<{ displayName?: string }>;
    clock?: { displayValue?: string };
    action?: string;
    playerName?: string;
    time?: string;
  }>;
  // Added for real-time match data
  currentScore?: string;
  matchStatus?: string;
  fplContext?: {
    users?: number;
    relevantPicks?: Array<{
      player?: { web_name?: string; name?: string };
      name?: string;
    }>;
    captainChoices?: string[];
    viceCaptainChoices?: string[];
    fantasyImpact?: string;
    // Enhanced manager details
    managers?: Array<{
      username: string;
      picks: Array<{
        player?: {
          web_name?: string;
          name?: string;
          team?: {
            short_name?: string;
          };
        };
        position?: number;
        is_captain?: boolean;
        is_vice_captain?: boolean;
      }>;
      captain?: string;
      viceCaptain?: string;
    }>;
    managerSummary?: {
      totalManagers: number;
      totalRelevantPicks: number;
      captains: string[];
    };
  };
}

export interface RichMatchEvent {
  type: {
    text: string;
  };
  clock: {
    displayValue: string;
  };
  team: {
    id: string;
    abbreviation: string;
  };
  athletesInvolved: Array<{ displayName: string }>;
}

export interface Commentator {
  id: string;
  name: string;
  displayName: string;
  description: string;
  style: 'dramatic' | 'analytical' | 'enthusiastic' | 'poetic';
  dataset: string;
  generateCommentary: (matchEvent: MatchEvent) => Promise<string>;
}

export interface CommentatorConfig {
  defaultCommentator: string;
  availableCommentators: string[];
  userPreference?: string;
}
