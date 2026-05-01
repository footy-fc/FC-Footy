import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

function getTeamPreferencesKey(fid: number): string {
  return `fc-footy:preference:${fid}`;
}

function getPrimaryTeamKey(fid: number): string {
  return `fc-footy:primary-team:${fid}`;
}

function getPrimaryTeamFansKey(teamId: string): string {
  return `fc-footy:primary-team-fans:${teamId}`;
}

const COUNTRY_LEAGUE_PREFIXES = [
  "fifa.worldq.",
  "caf.nations",
  "uefa.nations",
];

export function isCountryTeamId(teamId: string): boolean {
  const [leagueId] = teamId.split("-");
  return COUNTRY_LEAGUE_PREFIXES.some((prefix) => leagueId.startsWith(prefix));
}

export function isClubTeamId(teamId: string): boolean {
  return !isCountryTeamId(teamId);
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
  const oldPreferences = await getTeamPreferences(fid);
  const oldPrimaryTeam = oldPreferences?.[0] ?? null;
  const newPrimaryTeam = teams[0] ?? null;

  if (oldPreferences && oldPreferences.length > 0) {
    const pipeline = redis.pipeline();
    for (const teamId of oldPreferences) {
      pipeline.srem(`fc-footy:team-fans:${teamId}`, fid);
    }
    if (oldPrimaryTeam) {
      pipeline.srem(getPrimaryTeamFansKey(oldPrimaryTeam), fid);
    }
    await pipeline.exec();
  }

  await redis.set(getTeamPreferencesKey(fid), teams);

  if (teams.length > 0) {
    const pipeline = redis.pipeline();
    for (const teamId of teams) {
      pipeline.sadd(`fc-footy:team-fans:${teamId}`, fid);
    }
    if (newPrimaryTeam) {
      pipeline.set(getPrimaryTeamKey(fid), newPrimaryTeam);
      pipeline.sadd(getPrimaryTeamFansKey(newPrimaryTeam), fid);
    }
    await pipeline.exec();
  } else {
    await redis.del(getPrimaryTeamKey(fid));
  }
}

/**
 * Delete the team preferences for a user.
 */
export async function deleteTeamPreferences(fid: number): Promise<void> {
  const oldPreferences = await getTeamPreferences(fid);
  const oldPrimaryTeam = oldPreferences?.[0] ?? null;
  const pipeline = redis.pipeline();
  pipeline.del(getTeamPreferencesKey(fid));
  pipeline.del(getPrimaryTeamKey(fid));
  if (oldPreferences?.length) {
    for (const teamId of oldPreferences) {
      pipeline.srem(`fc-footy:team-fans:${teamId}`, fid);
    }
  }
  if (oldPrimaryTeam) {
    pipeline.srem(getPrimaryTeamFansKey(oldPrimaryTeam), fid);
  }
  await pipeline.exec();
}

export async function getPrimaryTeam(fid: number): Promise<string | null> {
  const primaryTeam = await redis.get<string>(getPrimaryTeamKey(fid));
  if (primaryTeam) return primaryTeam;

  const preferences = await getTeamPreferences(fid);
  return preferences?.[0] ?? null;
}

export async function getPrimaryClub(fid: number): Promise<string | null> {
  const preferences = await getTeamPreferences(fid);
  return preferences?.find((teamId) => isClubTeamId(teamId)) ?? null;
}

export async function getPrimaryCountry(fid: number): Promise<string | null> {
  const preferences = await getTeamPreferences(fid);
  return preferences?.find((teamId) => isCountryTeamId(teamId)) ?? null;
}

/**
 * DEPRECATED: Use getFansForTeams([teamId]) instead.
 */
export async function getFansForTeam(uniqueTeamId: string): Promise<number[]> {
  return await getFansForTeams([uniqueTeamId]);
}

export async function getPrimaryFansForTeam(teamId: string): Promise<number[]> {
  const normalizedTeamId = teamId.toLowerCase();
  const fanFidsSet = new Set<number>();

  try {
    const members = await redis.smembers<number[] | string[]>(getPrimaryTeamFansKey(normalizedTeamId));
    members
      .map((value) => (typeof value === "string" ? Number(value) : value))
      .filter((value) => !Number.isNaN(value))
      .forEach((fid) => fanFidsSet.add(fid));
  } catch (err) {
    console.error("SMEMBERS failed in getPrimaryFansForTeam", err);
  }

  // Backfill from the legacy preference array so old users still show up as true fans.
  const allFollowers = await getFansForTeams([normalizedTeamId]);
  if (allFollowers.length === 0) {
    return Array.from(fanFidsSet);
  }

  const checks = await Promise.all(
    allFollowers.map(async (fid) => {
      const preferences = await getTeamPreferences(fid);
      return preferences?.[0]?.toLowerCase() === normalizedTeamId ? fid : null;
    })
  );

  const pipeline = redis.pipeline();
  let hasBackfill = false;
  checks.forEach((fid) => {
    if (typeof fid === "number" && !Number.isNaN(fid)) {
      fanFidsSet.add(fid);
      pipeline.sadd(getPrimaryTeamFansKey(normalizedTeamId), fid);
      pipeline.set(getPrimaryTeamKey(fid), normalizedTeamId);
      hasBackfill = true;
    }
  });

  if (hasBackfill) {
    await pipeline.exec();
  }

  return Array.from(fanFidsSet);
}

/**
 * Get all fan FIDs for a given list of teams (by unique team IDs) from KV.
 * This function retrieves the team-fans set for each unique team ID and returns an array
 * of FIDs for which the stored preferences include any of the given unique team IDs.
 */
export async function getFansForTeams(uniqueTeamIds: string[]): Promise<number[]> {
  const fanFidsSet = new Set<number>();

  if (uniqueTeamIds.length === 0) {
    return [];
  }

  // Use SUNION to let Redis union sets server‑side in a single call
  const keys = uniqueTeamIds.map((teamId) => `fc-footy:team-fans:${teamId}`);
  try {
    const members = (await (redis as any).sunion(...keys)) as Array<number | string> | null;
    if (Array.isArray(members)) {
      for (const v of members) {
        const n = typeof v === 'string' ? Number(v) : (v as number);
        if (!Number.isNaN(n)) fanFidsSet.add(n);
      }
    }
  } catch (err) {
    console.error('SUNION failed, falling back to pipeline SMEMBERS', err);
    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.smembers<number[] | string[]>(key);
    }
    const results = await pipeline.exec();
    results.forEach((r) => {
      const arr = Array.isArray(r)
        ? r
        : r && typeof r === 'object' && 'data' in (r as any)
        ? ((r as any).data as unknown)
        : r && typeof r === 'object' && 'result' in (r as any)
        ? ((r as any).result as unknown)
        : null;
      if (Array.isArray(arr)) {
        for (const v of arr) {
          const n = typeof v === 'string' ? Number(v) : (v as number);
          if (!Number.isNaN(n)) fanFidsSet.add(n);
        }
      }
    });
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
  ,
  "caf.nations"
];

/**
 * Fetches fans for a team using its abbreviation, checking all supported leagues.
 * @param teamAbbr - Team abbreviation (e.g., "ars" for Arsenal)
 * @returns Array of unique fan FIDs
 */
export async function getFansForTeamAbbr(teamAbbr: string): Promise<number[]> {
  const fanFidsSet = new Set<number>();

  const possibleTeamIds = SUPPORTED_LEAGUES.map((leagueId) => `${leagueId}-${teamAbbr.toLowerCase()}`);
  if (!possibleTeamIds.length) return [];

  const keys = possibleTeamIds.map((id) => `fc-footy:team-fans:${id}`);
  try {
    const members = (await (redis as any).sunion(...keys)) as Array<number | string> | null;
    if (Array.isArray(members)) {
      for (const v of members) {
        const n = typeof v === 'string' ? Number(v) : (v as number);
        if (!Number.isNaN(n)) fanFidsSet.add(n);
      }
    }
  } catch (err) {
    console.error('SUNION failed in getFansForTeamAbbr, falling back', err);
    for (const key of keys) {
      try {
        const arr = await redis.smembers<number[] | string[]>(key);
        for (const v of arr) {
          const n = typeof v === 'string' ? Number(v) : (v as number);
          if (!Number.isNaN(n)) fanFidsSet.add(n);
        }
      } catch (e) {
        console.error('SMEMBERS error for', key, e);
      }
    }
  }

  return Array.from(fanFidsSet);
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

export async function getPrimaryFanCountForTeam(teamId: string): Promise<number> {
  const fans = await getPrimaryFansForTeam(teamId);
  return fans.length;
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

  // Generate keys and SUNION for a single server-side union
  const keys = leagueIds.map((leagueId) => `fc-footy:team-fans:${leagueId}-${teamAbbr.toLowerCase()}`);
  try {
    const members = (await (redis as any).sunion(...keys)) as Array<number | string> | null;
    return Array.isArray(members) ? members.length : 0;
  } catch (err) {
    console.error('SUNION failed in getFansForTeamWithLeagues, falling back', err);
    const set = new Set<number>();
    const pipeline = redis.pipeline();
    for (const key of keys) pipeline.smembers<number[] | string[]>(key);
    const results = await pipeline.exec();
    results.forEach((r) => {
      const arr = Array.isArray(r)
        ? r
        : r && typeof r === 'object' && 'data' in (r as any)
        ? ((r as any).data as unknown)
        : r && typeof r === 'object' && 'result' in (r as any)
        ? ((r as any).result as unknown)
        : null;
      if (Array.isArray(arr)) {
        for (const v of arr) {
          const n = typeof v === 'string' ? Number(v) : (v as number);
          if (!Number.isNaN(n)) set.add(n);
        }
      }
    });
    return set.size;
  }
}
