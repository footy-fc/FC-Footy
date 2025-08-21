// Team Migration Service for FC-Footy
// Handles migration of existing hardcoded team data to Redis-based system

import { teamService } from './teamService';
import { ESPNLogoService } from './espnLogoService';
import { MigrationResult, CreateLeagueData } from '../types/teamTypes';

// Import existing team data structure
const teamsByLeague: Record<string, { team: string; abbr: string; roomHash?: string; logoUrl?: string }[]> = {
  "eng.1": [
    { team: "Arsenal", abbr: "ars", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Aston Villa", abbr: "avl", roomHash: "0xec615487f9c2c53263b4fd548ea298814c70343a" },
    { team: "Bournemouth", abbr: "bou", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Brentford", abbr: "bre", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Brighton", abbr: "bha", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Chelsea", abbr: "che", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Crystal Palace", abbr: "cry", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Everton", abbr: "eve", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Fulham", abbr: "ful", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Ipswich", abbr: "ips", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Leicester", abbr: "lei", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Liverpool", abbr: "liv", roomHash: "0x8e54d2497fbc73f1c8ff40ad8338afacef692364" },
    { team: "Man City", abbr: "mnc", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Man Utd", abbr: "man", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Newcastle", abbr: "new", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Nott'm Forest", abbr: "nfo", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Southampton", abbr: "sou", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Spurs", abbr: "tot", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "West Ham", abbr: "whu", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Wolves", abbr: "wol", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" }
  ],
  "eng.2": [
    { team: "Burnley", abbr: "bur", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Luton Town", abbr: "lut", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Sheffield United", abbr: "shu", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Sunderland", abbr: "sun", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "West Bromwich Albion", abbr: "wba", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Leeds United", abbr: "lee", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Norwich City", abbr: "nor", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Middlesbrough", abbr: "mid", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Coventry City", abbr: "cov", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Hull City", abbr: "hul", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Preston North End", abbr: "pre", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Stoke City", abbr: "sto", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Queens Park Rangers", abbr: "qpr", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Swansea City", abbr: "swa", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Blackburn Rovers", abbr: "bla", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Bristol City", abbr: "bri", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Watford", abbr: "wat", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Cardiff City", abbr: "car", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Millwall", abbr: "mil", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Plymouth Argyle", abbr: "ply", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Sheffield Wednesday", abbr: "shw", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Derby County", abbr: "der", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Oxford United", abbr: "oxf", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Portsmouth", abbr: "por", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" }
  ],
  "esp.1": [
    { team: "Athletic Bilbao", abbr: "ath", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Atlético de Madrid", abbr: "atm", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "CA Osasuna", abbr: "osa", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "CD Leganés", abbr: "leg", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Celta de Vigo", abbr: "cel", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Deportivo Alavés", abbr: "alv", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "FC Barcelona", abbr: "bar", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Getafe CF", abbr: "get", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Girona FC", abbr: "gir", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "RCD Espanyol Barcelona", abbr: "esp", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "RCD Mallorca", abbr: "mal", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Rayo Vallecano", abbr: "ray", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Real Betis Balompié", abbr: "bet", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Real Madrid", abbr: "rma", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Real Sociedad", abbr: "rso", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Real Valladolid CF", abbr: "vll", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Sevilla FC", abbr: "sev", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "UD Las Palmas", abbr: "lpa", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Valencia CF", abbr: "val", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" },
    { team: "Villarreal CF", abbr: "vil", roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0" }
  ],
  "usa.1": [
    { team: "Atlanta United", abbr: "atl" },
    { team: "Austin FC", abbr: "atx" },
    { team: "Chicago Fire", abbr: "chi" },
    { team: "FC Cincinnati", abbr: "cin" },
    { team: "Columbus Crew", abbr: "clb" },
    { team: "Charlotte FC", abbr: "clt" },
    { team: "Colorado Rapids", abbr: "col" },
    { team: "FC Dallas", abbr: "dal" },
    { team: "D.C. United", abbr: "dcu" },
    { team: "Houston Dynamo", abbr: "hou" },
    { team: "LA Galaxy", abbr: "lag" },
    { team: "LAFC", abbr: "laf" },
    { team: "Inter Miami", abbr: "mia" },
    { team: "Minnesota United", abbr: "min" },
    { team: "New England Revolution", abbr: "ner" },
    { team: "Nashville SC", abbr: "nsh" },
    { team: "New York City FC", abbr: "nyc" },
    { team: "New York Red Bulls", abbr: "nyr" },
    { team: "Orlando City SC", abbr: "orl" },
    { team: "Philadelphia Union", abbr: "phi" },
    { team: "Portland Timbers", abbr: "por" },
    { team: "Real Salt Lake", abbr: "rsl" },
    { team: "San Jose Earthquakes", abbr: "sj" },
    { team: "Seattle Sounders", abbr: "sea", roomHash: "0x43c00e7cc2e247a924da0360134884736192e34b" },
    { team: "Sporting Kansas City", abbr: "skc" },
    { team: "St. Louis City SC", abbr: "stl" },
    { team: "Toronto FC", abbr: "tor" },
    { team: "Vancouver Whitecaps", abbr: "van" }
  ],
  "fra.1": [
    { team: "AJ Auxerre", abbr: "aja", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/aja.png" },
    { team: "Angers SCO", abbr: "ang", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/ang.png" },
    { team: "AS Monaco", abbr: "asm", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/asm.png" },
    { team: "AS Saint-Étienne", abbr: "ste", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/ste.png" },
    { team: "FC Nantes", abbr: "nte", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/nte.png" },
    { team: "FC Toulouse", abbr: "tol", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/tol.png" },
    { team: "Le Havre AC", abbr: "lhv", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/lhv.png" },
    { team: "LOSC Lille", abbr: "lil", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/lil.png" },
    { team: "Montpellier HSC", abbr: "mtp", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/mtp.png" },
    { team: "OGC Nice", abbr: "nic", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/nic.png" },
    { team: "Olympique Lyon", abbr: "lyo", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/lyo.png" },
    { team: "Olympique Marseille", abbr: "mar", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/mar.png" },
    { team: "Paris Saint-Germain", abbr: "psg", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/psg.png" },
    { team: "RC Lens", abbr: "len", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/len.png" },
    { team: "RC Strasbourg Alsace", abbr: "str", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/str.png" },
    { team: "Stade Brestois 29", abbr: "bre", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/bre.png" },
    { team: "Stade Reims", abbr: "rei", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/rei.png" },
    { team: "Stade Rennais FC", abbr: "ren", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/ren.png" }
  ]
};

// League definitions
const leagueDefinitions: CreateLeagueData[] = [
  { id: "eng.1", name: "Premier League", country: "ENG", type: "domestic" },
  { id: "eng.2", name: "Championship", country: "ENG", type: "domestic" },
  { id: "esp.1", name: "La Liga", country: "ESP", type: "domestic" },
  { id: "usa.1", name: "Major League Soccer", country: "USA", type: "domestic" },
  { id: "fra.1", name: "Ligue 1", country: "FRA", type: "domestic" },
  { id: "ger.1", name: "Bundesliga", country: "GER", type: "domestic" },
  { id: "ita.1", name: "Serie A", country: "ITA", type: "domestic" },
  { id: "uefa.champions", name: "UEFA Champions League", country: "EUR", type: "continental" },
  { id: "uefa.europa", name: "UEFA Europa League", country: "EUR", type: "continental" },
  { id: "fifa.worldq.conmebol", name: "World Cup Qualifiers - CONMEBOL", country: "SAM", type: "international" },
  { id: "fifa.worldq.uefa", name: "World Cup Qualifiers - UEFA", country: "EUR", type: "international" },
  { id: "fifa.worldq.concacaf", name: "World Cup Qualifiers - CONCACAF", country: "NAM", type: "international" },
  { id: "fifa.worldq.afc", name: "World Cup Qualifiers - AFC", country: "ASI", type: "international" },
  { id: "fifa.worldq.caf", name: "World Cup Qualifiers - CAF", country: "AFR", type: "international" }
];

// Default room hash for teams without one
const DEFAULT_ROOM_HASH = "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0";

export class TeamMigrationService {
  
  /**
   * Migrate existing hardcoded team data to Redis
   */
  static async migrateExistingData(): Promise<MigrationResult> {
    const result: MigrationResult = {
      teamsCreated: 0,
      leaguesCreated: 0,
      membershipsCreated: 0,
      errors: []
    };

    console.log('🚀 Starting team data migration...');

    try {
      // Track created teams to avoid duplicates
      const createdTeams = new Map<string, string>(); // abbreviation -> teamId

      // Step 1: Create leagues
      console.log('📋 Creating leagues...');
      for (const leagueData of leagueDefinitions) {
        try {
          await teamService.createLeague(leagueData);
          result.leaguesCreated++;
          console.log(`✅ Created league: ${leagueData.name} (${leagueData.id})`);
        } catch (error) {
          const errorMsg = `Failed to create league ${leagueData.id}: ${error}`;
          console.error(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      // Step 2: Create teams and memberships
      console.log('📋 Processing teams and memberships...');
      for (const [leagueId, teams] of Object.entries(teamsByLeague)) {
        console.log(`📋 Processing league: ${leagueId}`);
        
        for (const teamData of teams) {
          try {
            const teamAbbr = teamData.abbr.toLowerCase();
            
            // Check if team already exists
            let teamId = createdTeams.get(teamAbbr);
            
            if (!teamId) {
              // Create new team
              const team = await teamService.createTeam({
                name: teamData.team,
                shortName: teamData.team,
                abbreviation: teamAbbr,
                country: TeamMigrationService.getCountryFromLeague(leagueId),
                logoUrl: teamData.logoUrl || ESPNLogoService.getLogoUrl(teamAbbr),
                roomHash: teamData.roomHash || DEFAULT_ROOM_HASH
              });
              
              teamId = team.id;
              createdTeams.set(teamAbbr, teamId);
              result.teamsCreated++;
              
              console.log(`✅ Created team: ${teamData.team} (${teamAbbr})`);
            }

            // Create team-league membership
            await teamService.addTeamToLeague({
              teamId: teamId,
              leagueId: leagueId,
              season: '2024-25',
              startDate: new Date().toISOString().split('T')[0]
            });
            
            result.membershipsCreated++;
            console.log(`🔗 Added ${teamData.team} to ${leagueId}`);
            
          } catch (error) {
            const errorMsg = `Failed to process team ${teamData.team} in ${leagueId}: ${error}`;
            console.error(`❌ ${errorMsg}`);
            result.errors.push(errorMsg);
          }
        }
      }

      console.log(`🎉 Migration completed!`);
      console.log(`📊 Results:`);
      console.log(`   - Teams created: ${result.teamsCreated}`);
      console.log(`   - Leagues created: ${result.leaguesCreated}`);
      console.log(`   - Memberships created: ${result.membershipsCreated}`);
      console.log(`   - Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.log(`⚠️  Errors encountered:`);
        result.errors.forEach(error => console.log(`   - ${error}`));
      }

    } catch (error) {
      console.error('💥 Migration failed:', error);
      result.errors.push(`Migration failed: ${error}`);
    }

    return result;
  }

  /**
   * Validate and fix ESPN logos for all teams
   */
  static async validateAndFixTeamLogos(): Promise<{ valid: number; invalid: number; fixed: number }> {
    console.log('🔍 Validating and fixing team logos...');
    
    let valid = 0;
    let invalid = 0;
    let fixed = 0;

    try {
      // Get all teams
      const allTeams = await teamService.getAllTeams();
      
      for (const team of allTeams) {
        try {
          // Check if current logo is valid
          const isValid = await ESPNLogoService.validateLogo(team.abbreviation);
          
          if (isValid) {
            valid++;
          } else {
            invalid++;
            
            // Try to fix with fallback
            const fallbackUrl = ESPNLogoService.getLogoUrl(team.abbreviation);
            if (fallbackUrl && fallbackUrl !== team.logoUrl) {
              await teamService.updateTeam(team.id, { logoUrl: fallbackUrl });
              fixed++;
              console.log(`✅ Fixed logo for ${team.name} (${team.abbreviation})`);
            }
          }
        } catch {
          console.error(`❌ Error validating logo for ${team.name} (${team.abbreviation})`);
          invalid++;
        }
      }
      
      console.log(`📊 Logo validation complete: ${valid} valid, ${invalid} invalid, ${fixed} fixed`);
      return { valid, invalid, fixed };
      
    } catch (error) {
      console.error('💥 Logo validation failed:', error);
      throw error;
    }
  }



  /**
   * Get country code from league ID
   */
  private static getCountryFromLeague(leagueId: string): string {
    const countryMap: Record<string, string> = {
      "eng.1": "ENG",
      "eng.2": "ENG",
      "esp.1": "ESP",
      "usa.1": "USA",
      "fra.1": "FRA",
      "ger.1": "GER",
      "ita.1": "ITA",
      "uefa.champions": "EUR",
      "uefa.europa": "EUR",
      "fifa.worldq.conmebol": "SAM",
      "fifa.worldq.uefa": "EUR",
      "fifa.worldq.concacaf": "NAM",
      "fifa.worldq.afc": "ASI",
      "fifa.worldq.caf": "AFR"
    };
    
    return countryMap[leagueId] || "UNK";
  }

  /**
   * Clean up migration data (for testing)
   */
  static async cleanupMigrationData(): Promise<void> {
    console.log('🧹 Cleaning up migration data...');
    
    // This would remove all team, league, and membership data
    // Use with caution in production
    try {
      // Implementation would depend on Redis key patterns
      console.log('⚠️  Cleanup not implemented - use with caution in production');
    } catch (error) {
      console.error('Failed to cleanup migration data:', error);
    }
  }
} 