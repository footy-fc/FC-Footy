import { getTeamPreferences } from '../../lib/kvPerferences';
import fantasyManagersLookup from '../../data/fantasy-managers-lookup.json';
import { fetchUsersByFids } from '~/lib/hypersnap';
import { FPL_LEAGUE_ID } from '~/lib/config';

// Define FPL API response types
interface FPLStandingResult {
  id: number;
  event_total: number;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
  entry_name: string;
  has_played: boolean;
}

interface FPLNewEntryResult {
  entry: number;
  entry_name: string;
  player_first_name: string;
  player_last_name: string;
  joined_time: string;
}

interface FPLStandingsResponse {
  new_entries: {
    has_next: boolean;
    page: number;
    results: FPLNewEntryResult[];
  };
  last_updated_data: string | null;
  league: {
    id: number;
    name: string;
    created: string;
    closed: boolean;
    max_entries: number | null;
    league_type: string;
    scoring: string;
    admin_entry: number;
    start_event: number;
    code_privacy: string;
    has_cup: boolean;
    cup_league: null;
    rank: null;
  };
  standings: {
    has_next: boolean;
    page: number;
    results: FPLStandingResult[];
  };
}

interface FantasyManagerLookupEntry {
  entry_id: number;
  fid: number;
  team_name: string;
}

const fantasyManagerMappings = fantasyManagersLookup as FantasyManagerLookupEntry[];

function extractFidFromName(...values: Array<string | null | undefined>): number | null {
  for (const value of values) {
    const match = value?.match(/^\s*(\d{2,})\s*$/);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

async function resolveUsernameFromFid(fid: number, fallback: string): Promise<string> {
  try {
    const users = await fetchUsersByFids([fid]);
    return users[0]?.username || fallback;
  } catch (e) {
    console.error("Error fetching user data for fid:", fid, e);
    return fallback;
  }
}

async function transformStandingEntry(entry: FPLStandingResult): Promise<FantasyEntry> {
  const lookupEntry = fantasyManagerMappings.find(
    (lookup) => lookup.entry_id === entry.entry
  );

  let username = entry.player_name || 'Unknown';
  let fid: number | null = null;
  let teamName = entry.entry_name;

  if (lookupEntry) {
    fid = lookupEntry.fid;
    username = lookupEntry.team_name;
    teamName = lookupEntry.team_name;
  } else {
    const fidMatch = entry.entry_name.match(/(\d{3,})/) || entry.player_name.match(/(\d{3,})/);
    if (fidMatch) {
      fid = parseInt(fidMatch[1], 10);

      if (Number.isInteger(fid)) {
        username = await resolveUsernameFromFid(fid, username);
      }
    }
  }

  return {
    id: entry.id,
    entry_id: entry.entry,
    rank: entry.rank,
    manager: username,
    teamName: teamName,
    totalPoints: entry.total,
    eventTotal: entry.event_total,
    entry: entry.entry,
    entryName: entry.entry_name,
    fid: fid || undefined
  };
}

async function transformNewEntry(entry: FPLNewEntryResult, index: number): Promise<FantasyEntry> {
  const lookupByEntry = fantasyManagerMappings.find(
    (lookup) => lookup.entry_id === entry.entry
  );
  const extractedFid = extractFidFromName(entry.player_last_name, entry.player_first_name);
  const lookupByFid = extractedFid
    ? fantasyManagerMappings.find((lookup) => lookup.fid === extractedFid)
    : null;
  const lookupEntry = lookupByEntry ?? lookupByFid;
  const fid = lookupEntry?.fid ?? extractedFid ?? null;
  const fallbackName = [entry.player_first_name, entry.player_last_name].filter(Boolean).join(' ').trim() || entry.entry_name;
  const username = lookupEntry?.team_name ?? (fid ? await resolveUsernameFromFid(fid, fallbackName) : fallbackName);

  return {
    id: entry.entry,
    entry_id: entry.entry,
    rank: index + 1,
    manager: username,
    teamName: entry.entry_name,
    totalPoints: 0,
    eventTotal: 0,
    entry: entry.entry,
    entryName: entry.entry_name,
    fid: fid || undefined
  };
}

async function transformFPLLeagueResponse(data: FPLStandingsResponse): Promise<FantasyEntry[]> {
  const standings = data.standings?.results || [];
  if (standings.length > 0) {
    return Promise.all(standings.map(transformStandingEntry));
  }

  const newEntries = data.new_entries?.results || [];
  return Promise.all(newEntries.map(transformNewEntry));
}

// Define FantasyEntry type to match our app's expected data structure
export interface FantasyEntry {
  id: number;
  entry_id: number;
  rank: number;
  manager: string;
  teamName: string;
  totalPoints: number;
  eventTotal: number;
  entry: number;
  entryName: string;
  fid?: number;
  team?: {
    name: string | null;
    logo: string | null;
  };
}

/**
 * Fetch FPL league standings (cached daily)
 */
export const fetchFPLLeagueData = async (leagueId: number = FPL_LEAGUE_ID): Promise<FantasyEntry[]> => {
  //console.log(`Fetching FPL league data for league ${leagueId}...`);

  try {
    // Use our server-side proxy with daily caching
    const url = `/api/fpl-league?leagueId=${leagueId}`;
    console.log(`Fetching from cached endpoint: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`FPL API failed:`, response.status, response.statusText);
      console.error(`FPL API URL:`, url);
      throw new Error(`FPL API failed: ${response.status}`);
    }
    
    const data: FPLStandingsResponse = await response.json();
    
    if (!data.standings?.results && !data.new_entries?.results) {
      console.error('No standings data in response:', data);
      throw new Error('No standings data received');
    }

    return transformFPLLeagueResponse(data);
  } catch (error) {
    // The API endpoint owns pagination and caching. Do not fall back to a direct
    // browser request here: the FPL endpoint returns one 50-manager page by
    // default, which would silently render an incomplete league table.
    console.error('Error fetching complete FPL league data from the API:', error);
    throw error;
  }
};



// Update the main function to use FPL API with Upstash favorite team data
export const fetchFantasyData = async (): Promise<FantasyEntry[]> => {
  try {
    // Try FPL API first for current standings
    //console.log('🔄 Fetching FPL league data...');
    const fplData = await fetchFPLLeagueData(FPL_LEAGUE_ID); // Farcaster Fantasy League
    //console.log(`✅ FPL data fetched in ${Date.now() - startTime}ms`);
    
    // Enhance FPL data with favorite team information from Upstash
    //console.log(`🔄 Enhancing ${fplData.length} entries with favorite team data...`);
    const enhancedData = await Promise.all(
      fplData.map(async (entry, index) => {
        if (index % 10 === 0) {
          //console.log(`🔄 Processing entry ${index + 1}/${fplData.length}...`);
        }
        let favoriteTeamInfo: { name: string | null; logo: string | null } = { name: null, logo: null };
        
        // If we have a FID, try to get their favorite team from Upstash
        if (entry.fid) {
          try {
            //console.log(`🔍 Fetching favorite team for FID: ${entry.fid}`);
            const favoriteTeams = await getTeamPreferences(entry.fid);
            //console.log(`📋 Favorite teams for FID ${entry.fid}:`, favoriteTeams);
            
            if (favoriteTeams && favoriteTeams.length > 0) {
              // Get the first favorite team
              const favoriteTeamId = favoriteTeams[0];
              //console.log(`🏆 First favorite team ID: ${favoriteTeamId}`);
              
              const [league, teamAbbr] = favoriteTeamId.split('-');
              console.log(`🔗 Parsed: league=${league}, teamAbbr=${teamAbbr}`);
              
              // Map team abbreviation to team name and logo
              const teamMapping = getTeamMapping(teamAbbr);
              //console.log(`🗺️ Team mapping for ${teamAbbr}:`, teamMapping);
              
              if (teamMapping) {
                favoriteTeamInfo = {
                  name: teamMapping.name,
                  logo: teamMapping.logo
                };
                //console.log(`✅ Set favorite team info:`, favoriteTeamInfo);
              } else {
                //console.log(`❌ No team mapping found for abbreviation: ${teamAbbr}`);
              }
            } else {
              ////console.log(`❌ No favorite teams found for FID: ${entry.fid}`);
            }
          } catch (error) {
            console.error(`❌ Error fetching favorite team for FID ${entry.fid}:`, error);
          }
        } else {
          //console.log(`❌ No FID available for entry:`, entry.manager);
        }
        
        return {
          ...entry,
          team: favoriteTeamInfo
        };
      })
    );
    
    //console.log(`✅ Successfully enhanced ${enhancedData.length} entries with favorite team data in ${Date.now() - startTime}ms total`);
    
    return enhancedData;
  } catch (error) {
    console.error('Failed to fetch fantasy data:', error);
    throw new Error('Failed to fetch fantasy data from all sources');
  }
};

// Helper function to map team abbreviations to names and logos
function getTeamMapping(teamAbbr: string): { name: string; logo: string } | null {
  const teamMappings: Record<string, { name: string; logo: string }> = {
    'ars': { name: 'Arsenal', logo: '/assets/logos/ars.png' },
    'che': { name: 'Chelsea', logo: '/assets/logos/che.png' },
    'liv': { name: 'Liverpool', logo: '/assets/logos/liv.png' },
    'bou': { name: 'Bournemouth', logo: '/assets/bou-logo.png' },
    // Add more teams as needed
  };
  
  return teamMappings[teamAbbr.toLowerCase()] || null;
}
