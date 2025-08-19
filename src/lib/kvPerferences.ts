import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

function getTeamPreferencesKey(fid: number): string {
  return `fc-footy:preference:${fid}`;
}

/**
 * Get the team preferences for a user.
 * The returned array contains unique team IDs (e.g. "eng.1-ars").
 */
export async function getTeamPreferences(fid: number): Promise<string[] | null> {
  const res = await redis.get<string[]>(getTeamPreferencesKey(fid));
  // console.log("getTeamPreferences", res);
  return res;
}

/**
 * Set the team preferences for a user.
 * The teams array contains unique team IDs (e.g. "eng.1-ars").
 */
export async function setTeamPreferences(fid: number, teams: string[]): Promise<void> {
  // console.log("setTeamPreferences", teams, fid);

  // Remove the user from existing team-fans index first.
  const oldPreferences = await getTeamPreferences(fid);
  if (oldPreferences && oldPreferences.length > 0) {
    // Batch the SREM operations
    const pipeline = redis.pipeline();
    for (const teamId of oldPreferences) {
      pipeline.srem(`fc-footy:team-fans:${teamId}`, fid);
    }
    await pipeline.exec();
  }

  // Update the preferences for the user.
  await redis.set(getTeamPreferencesKey(fid), teams);

  // Add the user to the new team-fans index for each unique team ID.
  if (teams.length > 0) {
    // Batch the SADD operations
    const pipeline = redis.pipeline();
    for (const teamId of teams) {
      pipeline.sadd(`fc-footy:team-fans:${teamId}`, fid);
    }
    await pipeline.exec();
  }
}

/**
 * Delete the team preferences for a user.
 */
export async function deleteTeamPreferences(fid: number): Promise<void> {
  await redis.del(getTeamPreferencesKey(fid));
}

/**
 * DEPRECATED: Use getFansForTeams([teamId]) instead.
 */
export async function getFansForTeam(uniqueTeamId: string): Promise<number[]> {
  return await getFansForTeams([uniqueTeamId]);
}

/**
 * Get all fan FIDs for a given list of teams (by unique team IDs) from KV.
 * This function retrieves the team-fans set for each unique team ID and returns an array
 * of FIDs for which the stored preferences include any of the given unique team IDs.
 */
export async function getFansForTeams(uniqueTeamIds: string[]): Promise<number[]> {
//console.log("getFansForTeams", uniqueTeamIds);
  const fanFidsSet = new Set<number>();

  if (uniqueTeamIds.length === 0) {
    return Array.from(fanFidsSet);
  }

  // Batch the SMEMBERS operations
  const pipeline = redis.pipeline();
  for (const teamId of uniqueTeamIds) {
    pipeline.smembers<number[]>(`fc-footy:team-fans:${teamId}`);
  }
  
  const results = await pipeline.exec();
  
  // Debug logging to understand the results structure
  if (process.env.NODE_ENV === 'development') {
    console.log('Pipeline results structure:', JSON.stringify(results, null, 2));
  }
  
  // Process the batched results - handle both array and error results
  results.forEach((result, index) => {
    if (result && Array.isArray(result)) {
      result.forEach((fid) => fanFidsSet.add(fid));
    } else if (result instanceof Error) {
      console.error(`Error fetching fans for ${uniqueTeamIds[index]}:`, result);
    } else if (result && typeof result === 'object' && 'data' in result) {
      // Handle case where result might be wrapped in an object
      const wrappedResult = result as { data: unknown };
      if (Array.isArray(wrappedResult.data)) {
        wrappedResult.data.forEach((fid) => fanFidsSet.add(fid as number));
      }
    } else if (result && typeof result === 'object' && 'result' in result) {
      // Handle case where result might be wrapped in a result property
      const wrappedResult = result as { result: unknown };
      if (Array.isArray(wrappedResult.result)) {
        wrappedResult.result.forEach((fid) => fanFidsSet.add(fid as number));
      }
    }
  });

  return Array.from(fanFidsSet);
}

// List of supported leagues (add more as needed)
const SUPPORTED_LEAGUES = [
  "eng.1",
  "eng.2",
  "uefa.champions",
  "usa.1",
  "esp.1",
  "ger.1",
  "ita.1",
  "fra.1",
  "eng.league_cup",
  "uefa.europa",
  "eng.fa",
  "fifa.worldq.concacaf",
  "fifa.worldq.conmebol",
  "fifa.worldq.uefa",
  "fifa.worldq.afc",
  "fifa.worldq.caf",
  "fifa.worldq.ofc"
];

/**
 * Fetches fans for a team using its abbreviation, checking all supported leagues.
 * @param teamAbbr - Team abbreviation (e.g., "ars" for Arsenal)
 * @returns Array of unique fan FIDs
 */
export async function getFansForTeamAbbr(teamAbbr: string): Promise<number[]> {
  const fanFidsSet = new Set<number>();
  
  // Generate all possible team IDs for the abbreviation across supported leagues
  const possibleTeamIds = SUPPORTED_LEAGUES.map((leagueId) => `${leagueId}-${teamAbbr.toLowerCase()}`);
  
  // console.log(`Fetching fans for team abbreviation "${teamAbbr}" across leagues: ${possibleTeamIds}`);

  if (possibleTeamIds.length === 0) {
    return Array.from(fanFidsSet);
  }

  // For now, use the original approach to ensure accurate counts
  // TODO: Debug and fix the batching approach
  for (const teamId of possibleTeamIds) {
    try {
      const teamFans = await redis.smembers<number[]>(`fc-footy:team-fans:${teamId}`);
      teamFans.forEach((fid) => fanFidsSet.add(fid));
    } catch (err) {
      console.error(`Error fetching fans for ${teamId}:`, err);
    }
  }

  const fanFids = Array.from(fanFidsSet);
  //console.log(`Found ${fanFids.length} unique fans for "${teamAbbr}"`);
  return fanFids;
}

/**
 * Get the number of fans for a given team using Redis's SCARD command.
 * @param teamId - The unique team ID (e.g. "eng.1-ars")
 * @returns The count of fan FIDs
 */
export async function getFanCountForTeam(teamId: string): Promise<number> {
  const count = await redis.scard(`fc-footy:team-fans:${teamId}`);
  return count;
}

/**
 * Get follower count for a team based on its abbreviation and league assignments.
 * This is more efficient than getFansForTeamAbbr() as it only checks the leagues
 * the team is actually assigned to.
 * @param teamAbbr - Team abbreviation (e.g., "ars" for Arsenal)
 * @param leagueIds - Array of league IDs the team is assigned to (e.g., ["eng.1", "uefa.champions"])
 * @returns The total count of unique fans following this team across all assigned leagues
 */
export async function getFansForTeamWithLeagues(teamAbbr: string, leagueIds: string[]): Promise<number> {
  if (leagueIds.length === 0) {
    return 0; // No leagues assigned, no followers
  }

  const fanFidsSet = new Set<number>();
  
  // Generate team IDs for the specific leagues this team is assigned to
  const teamIds = leagueIds.map((leagueId) => `${leagueId}-${teamAbbr.toLowerCase()}`);
  
  // console.log(`Fetching fans for team "${teamAbbr}" in leagues: ${leagueIds}`, teamIds);

  // Batch the SMEMBERS operations
  const pipeline = redis.pipeline();
  for (const teamId of teamIds) {
    pipeline.smembers<number[]>(`fc-footy:team-fans:${teamId}`);
  }
  
  const results = await pipeline.exec();
  
  // Process the batched results - handle both array and error results
  results.forEach((result, index) => {
    if (result && Array.isArray(result)) {
      result.forEach((fid) => fanFidsSet.add(fid));
    } else if (result instanceof Error) {
      console.error(`Error fetching fans for ${teamIds[index]}:`, result);
    } else if (result && typeof result === 'object' && 'data' in result) {
      // Handle case where result might be wrapped in an object
      const wrappedResult = result as { data: unknown };
      if (Array.isArray(wrappedResult.data)) {
        wrappedResult.data.forEach((fid) => fanFidsSet.add(fid as number));
      }
    }
  });

  const fanCount = fanFidsSet.size;
  // console.log(`Found ${fanCount} unique fans for "${teamAbbr}" across ${leagueIds.length} leagues`);
  return fanCount;
}
