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
  if (oldPreferences) {
    for (const teamId of oldPreferences) {
      await redis.srem(`fc-footy:team-fans:${teamId}`, fid);
    }
  }

  // Update the preferences for the user.
  await redis.set(getTeamPreferencesKey(fid), teams);

  // Add the user to the new team-fans index for each unique team ID.
  for (const teamId of teams) {
    await redis.sadd(`fc-footy:team-fans:${teamId}`, fid);
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

  for (const teamId of uniqueTeamIds) {
    const teamFans = await redis.smembers<number[]>(`fc-footy:team-fans:${teamId}`);
    teamFans.forEach((fid) => fanFidsSet.add(fid));
  }

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
