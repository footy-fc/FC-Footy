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
