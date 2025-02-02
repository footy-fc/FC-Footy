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
  console.log("getTeamPreferences", res);
  return res;
}

/**
 * Set the team preferences for a user.
 * The teams array contains unique team IDs (e.g. "eng.1-ars").
 */
export async function setTeamPreferences(fid: number, teams: string[]): Promise<void> {
  console.log("setTeamPreferences", teams, fid);

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
 * Get all fan FIDs for a given team (by unique team ID) from KV.
 * This function scans keys with the prefix "fc-footy:preference:" and returns an array
 * of FIDs for which the stored preferences include the given unique team ID.
 */
export async function getFansForTeam(uniqueTeamId: string): Promise<number[]> {
  console.log("Scanning keys for fans of team:", uniqueTeamId);
  const keys = await redis.keys("fc-footy:preference:*");
  console.log("Found keys:", keys);
  const matchingFids: number[] = [];
  for (const key of keys) {
    const preferences = await redis.get<string[]>(key);
    if (preferences && preferences.includes(uniqueTeamId)) {
      // key is in the form "fc-footy:preference:{fid}"
      const parts = key.split(":");
      const fidStr = parts[parts.length - 1];
      const fid = Number(fidStr);
      if (!isNaN(fid)) {
        matchingFids.push(fid);
      }
    }
  }
  console.log("Matching fan FIDs for team", uniqueTeamId, matchingFids);
  return matchingFids;
}

/**
 * Get all fan FIDs for a given list of teams (by unique team IDs) from KV.
 * This function retrieves the team-fans set for each unique team ID and returns an array
 * of FIDs for which the stored preferences include any of the given unique team IDs.
 */
export async function getFansForTeams(uniqueTeamIds: string[]): Promise<number[]> {
  const fanFidsSet = new Set<number>();

  for (const teamId of uniqueTeamIds) {
    const teamFans = await redis.smembers<number[]>(`fc-footy:team-fans:${teamId}`);
    teamFans.forEach((fid) => fanFidsSet.add(fid));
  }

  return Array.from(fanFidsSet);
}
