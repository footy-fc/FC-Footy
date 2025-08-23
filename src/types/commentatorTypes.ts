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
  eventType: 'goal' | 'assist' | 'red_card' | 'yellow_card' | 'substitution' | 'final_whistle' | 'penalty' | 'free_kick';
  minute?: number;
  score?: string;
  context?: string;
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
