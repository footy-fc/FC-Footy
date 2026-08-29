import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';

export const BANTER_DAILY_LIMIT = 3;

function getGlobalDailyLimit() {
  const configured = Number(process.env.BANTER_GLOBAL_DAILY_LIMIT || 100);
  return Number.isInteger(configured) && configured > 0 ? configured : 100;
}

export const BANTER_GLOBAL_DAILY_LIMIT = getGlobalDailyLimit();

export type BanterMatchIdentity = {
  espnEventId?: string;
  competition?: string;
  homeTeam: string;
  awayTeam: string;
  matchDate?: string;
};

export type BanterUsageStatus = {
  usedForMatch: boolean;
  usedToday: number;
  remainingToday: number;
  dailyLimit: number;
  serviceLimitReached: boolean;
  resetsAt: string;
};

export type BanterReservation =
  | (BanterUsageStatus & { allowed: true })
  | (BanterUsageStatus & {
      allowed: false;
      reason: 'match_limit_reached' | 'daily_limit_reached' | 'service_limit_reached';
    });

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

const reserveScript = redis.createScript<Array<number | string>>(`
  local matchKey = KEYS[1]
  local dailyKey = KEYS[2]
  local globalDailyKey = KEYS[3]
  local ttl = tonumber(ARGV[1])
  local dailyLimit = tonumber(ARGV[2])
  local globalDailyLimit = tonumber(ARGV[3])
  local usedToday = tonumber(redis.call('GET', dailyKey) or '0')
  local globalUsedToday = tonumber(redis.call('GET', globalDailyKey) or '0')

  if redis.call('EXISTS', matchKey) == 1 then
    return {0, 'match_limit_reached', usedToday, globalUsedToday}
  end

  if usedToday >= dailyLimit then
    return {0, 'daily_limit_reached', usedToday, globalUsedToday}
  end

  if globalUsedToday >= globalDailyLimit then
    return {0, 'service_limit_reached', usedToday, globalUsedToday}
  end

  redis.call('SET', matchKey, '1', 'EX', ttl)
  usedToday = redis.call('INCR', dailyKey)
  redis.call('EXPIRE', dailyKey, ttl)
  globalUsedToday = redis.call('INCR', globalDailyKey)
  redis.call('EXPIRE', globalDailyKey, ttl)
  return {1, 'allowed', usedToday, globalUsedToday}
`);

const releaseScript = redis.createScript<number>(`
  local matchKey = KEYS[1]
  local dailyKey = KEYS[2]
  local globalDailyKey = KEYS[3]

  if redis.call('DEL', matchKey) == 0 then
    return 0
  end

  local usedToday = tonumber(redis.call('GET', dailyKey) or '0')
  if usedToday <= 1 then
    redis.call('DEL', dailyKey)
  else
    redis.call('DECR', dailyKey)
  end

  local globalUsedToday = tonumber(redis.call('GET', globalDailyKey) or '0')
  if globalUsedToday <= 1 then
    redis.call('DEL', globalDailyKey)
  else
    redis.call('DECR', globalDailyKey)
  end
  return 1
`);

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function normalizeIdentityPart(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') || 'unknown';
}

function getUtcDay(now: Date) {
  return now.toISOString().slice(0, 10);
}

function getResetDetails(now: Date) {
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const ttlSeconds = Math.max(60, Math.ceil((resetsAt.getTime() - now.getTime()) / 1000));
  return { resetsAt: resetsAt.toISOString(), ttlSeconds };
}

function getUsageKeys(userId: string, match: BanterMatchIdentity, now: Date) {
  const utcDay = getUtcDay(now);
  const userHash = digest(userId);
  const matchIdentity = match.espnEventId?.trim()
    ? `espn:${match.espnEventId.trim()}`
    : [
        normalizeIdentityPart(match.competition),
        normalizeIdentityPart(match.homeTeam),
        normalizeIdentityPart(match.awayTeam),
        normalizeIdentityPart(match.matchDate),
      ].join('|');
  const matchHash = digest(matchIdentity);

  return {
    matchKey: `fc-footy:banter-usage:${utcDay}:${userHash}:match:${matchHash}`,
    dailyKey: `fc-footy:banter-usage:${utcDay}:${userHash}:daily`,
    globalDailyKey: `fc-footy:banter-usage:${utcDay}:global`,
  };
}

function buildStatus(
  usedForMatch: boolean,
  usedToday: number,
  globalUsedToday: number,
  resetsAt: string
): BanterUsageStatus {
  return {
    usedForMatch,
    usedToday,
    remainingToday: Math.max(0, BANTER_DAILY_LIMIT - usedToday),
    dailyLimit: BANTER_DAILY_LIMIT,
    serviceLimitReached: globalUsedToday >= BANTER_GLOBAL_DAILY_LIMIT,
    resetsAt,
  };
}

export async function getBanterUsageStatus(
  userId: string,
  match: BanterMatchIdentity,
  now = new Date()
): Promise<BanterUsageStatus> {
  const { matchKey, dailyKey, globalDailyKey } = getUsageKeys(userId, match, now);
  const { resetsAt } = getResetDetails(now);
  const [usedForMatch, rawUsedToday, rawGlobalUsedToday] = await Promise.all([
    redis.exists(matchKey),
    redis.get<number | string>(dailyKey),
    redis.get<number | string>(globalDailyKey),
  ]);
  const usedToday = Number(rawUsedToday || 0);
  const globalUsedToday = Number(rawGlobalUsedToday || 0);
  return buildStatus(
    usedForMatch === 1,
    Number.isFinite(usedToday) ? usedToday : 0,
    Number.isFinite(globalUsedToday) ? globalUsedToday : 0,
    resetsAt
  );
}

export async function reserveBanterGeneration(
  userId: string,
  match: BanterMatchIdentity,
  now = new Date()
): Promise<BanterReservation> {
  const { matchKey, dailyKey, globalDailyKey } = getUsageKeys(userId, match, now);
  const { resetsAt, ttlSeconds } = getResetDetails(now);
  const result = await reserveScript.eval(
    [matchKey, dailyKey, globalDailyKey],
    [String(ttlSeconds), String(BANTER_DAILY_LIMIT), String(BANTER_GLOBAL_DAILY_LIMIT)]
  );
  const allowed = Number(result[0]) === 1;
  const reason = String(result[1]);
  const usedToday = Number(result[2] || 0);
  const globalUsedToday = Number(result[3] || 0);
  const status = buildStatus(
    allowed,
    Number.isFinite(usedToday) ? usedToday : 0,
    Number.isFinite(globalUsedToday) ? globalUsedToday : 0,
    resetsAt
  );

  if (allowed) {
    return { ...status, allowed: true };
  }

  return {
    ...status,
    usedForMatch: reason === 'match_limit_reached',
    allowed: false,
    reason:
      reason === 'daily_limit_reached' || reason === 'service_limit_reached'
        ? reason
        : 'match_limit_reached',
  };
}

export async function releaseBanterGeneration(
  userId: string,
  match: BanterMatchIdentity,
  now = new Date()
): Promise<void> {
  const { matchKey, dailyKey, globalDailyKey } = getUsageKeys(userId, match, now);
  await releaseScript.eval([matchKey, dailyKey, globalDailyKey], []);
}
