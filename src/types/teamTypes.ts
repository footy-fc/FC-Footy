// Team Management Types for FC-Footy
// Supports teams participating in multiple leagues simultaneously

export interface Team {
  id: string;                    // Unique team identifier
  name: string;                  // Full team name
  shortName: string;             // Short display name
  abbreviation: string;          // 3-letter code (e.g., "ars", "liv")
  country: string;               // Country code (e.g., "ENG", "ESP")
  logoUrl?: string;              // ESPN logo URL
  roomHash?: string;             // Optional room hash
  metadata?: { [key: string]: string };
  createdAt: string;
  updatedAt: string;
}

export interface League {
  id: string;                    // League identifier (e.g., "eng.1", "uefa.champions")
  name: string;                  // League name
  country: string;               // Country code
  type: "domestic" | "continental" | "international";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamLeagueMembership {
  id: string;                    // Unique membership ID
  teamId: string;                // Reference to team
  leagueId: string;              // Reference to league
  season: string;                // Season (e.g., "2024-25")
  startDate: string;             // When team joined this league
  endDate?: string;              // When team left (if applicable)
  active: boolean;               // Current membership status
  createdAt: string;
  updatedAt: string;
}

export interface TeamWithLeagues extends Team {
  leagues: League[];
}

export interface LeagueWithTeams extends League {
  teams: Team[];
}

// Service interfaces
export interface CreateTeamData {
  name: string;
  shortName: string;
  abbreviation: string;
  country: string;
  logoUrl?: string;
  roomHash?: string;
  metadata?: { [key: string]: string };
}

export interface CreateLeagueData {
  id: string;
  name: string;
  country: string;
  type: "domestic" | "continental" | "international";
  active?: boolean;
}

export interface CreateMembershipData {
  teamId: string;
  leagueId: string;
  season: string;
  startDate: string;
}

// Migration and validation types
export interface MigrationResult {
  teamsCreated: number;
  leaguesCreated: number;
  membershipsCreated: number;
  errors: string[];
}

export interface LogoValidationResult {
  validLogos: number;
  invalidLogos: number;
  fallbackLogos: number;
  errors: string[];
}

// ESPN Logo types
export interface ESPNLogoData {
  abbreviation: string;
  url: string;
  isValid: boolean;
  fallbackUrl?: string;
} 