import { Redis } from '@upstash/redis';
import type { FootyDelegatedApp, FootySignerCustody, FootySignerProvider, FootySignerStatus, FootyWalletProvider } from '~/lib/farcaster/types';

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export type UserFarcasterAccount = {
  userId: string;
  fid: number;
  username?: string | null;
  displayName?: string | null;
  custodyAddress?: string | null;
  signerPublicKey?: string | null;
  delegatedApp: FootyDelegatedApp;
  signerProvider: FootySignerProvider;
  signerStatus: FootySignerStatus;
  signerCustody: FootySignerCustody;
  walletProvider: FootyWalletProvider;
  createdAt: string;
  updatedAt: string;
};

export type FarcasterActionLog = {
  userId: string;
  fid: number;
  runtime: 'miniapp' | 'standalone';
  action: 'cast';
  text?: string | null;
  target?: string | null;
  timestamp: string;
  result?: string | null;
  hash?: string | null;
  error?: string | null;
};

function accountKey(userId: string) {
  return `fc-footy:farcaster-account:${userId}`;
}

function actionLogKey(userId: string) {
  return `fc-footy:farcaster-action-log:${userId}`;
}

function actionLogFidKey(fid: number) {
  return `fc-footy:farcaster-action-log-fid:${fid}`;
}

function signerSecretKey(userId: string, signerPublicKey: string) {
  return `fc-footy:farcaster-signer-secret:${userId}:${signerPublicKey}`;
}

function pendingSignerRequestKey(requestId: string) {
  return `fc-footy:farcaster-pending-signer:${requestId}`;
}

export type PendingFootySignerRequest = {
  requestId: string;
  userId: string;
  fid: number;
  custodyAddress: string;
  signerPublicKey: string;
  encryptedPrivateKey: string;
  metadataHex: string;
  deadline: string;
  addNonce: string;
  appFid: number;
  createdAt: string;
};

export async function upsertUserFarcasterAccount(
  account: Omit<UserFarcasterAccount, 'createdAt' | 'updatedAt'>
): Promise<UserFarcasterAccount> {
  const now = new Date().toISOString();
  const existing = await redis.get<UserFarcasterAccount>(accountKey(account.userId));

  const next: UserFarcasterAccount = {
    ...account,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await redis.set(accountKey(account.userId), next);
  return next;
}

export async function getUserFarcasterAccount(userId: string): Promise<UserFarcasterAccount | null> {
  return (await redis.get<UserFarcasterAccount>(accountKey(userId))) || null;
}

export async function appendFarcasterActionLog(log: FarcasterActionLog): Promise<void> {
  const userKey = actionLogKey(log.userId);
  const fidKey = actionLogFidKey(log.fid);
  const [existingByUser, existingByFid] = await Promise.all([
    redis.get<FarcasterActionLog[]>(userKey),
    redis.get<FarcasterActionLog[]>(fidKey),
  ]);
  const nextByUser = [log, ...((existingByUser || []))].slice(0, 50);
  const nextByFid = [log, ...((existingByFid || []))].slice(0, 50);
  await Promise.all([
    redis.set(userKey, nextByUser),
    redis.set(fidKey, nextByFid),
  ]);
}

export async function getFarcasterActionLogs(userId: string): Promise<FarcasterActionLog[]> {
  return (await redis.get<FarcasterActionLog[]>(actionLogKey(userId))) || [];
}

async function scanKeysByPattern(pattern: string, limit = 5000): Promise<string[]> {
  let cursor = "0";
  const keys: string[] = [];

  do {
    const [nextCursor, batch] = (await (redis as any).scan(cursor, {
      match: pattern,
      count: 500,
    })) as [string, string[]];

    if (Array.isArray(batch) && batch.length > 0) {
      for (const key of batch) {
        keys.push(key);
        if (keys.length >= limit) {
          return keys;
        }
      }
    }

    cursor = nextCursor;
  } while (cursor !== "0");

  return keys;
}

export async function getFarcasterActionLogsByFid(fid: number): Promise<FarcasterActionLog[]> {
  const indexed = await redis.get<FarcasterActionLog[]>(actionLogFidKey(fid));
  if (Array.isArray(indexed) && indexed.length > 0) {
    return indexed;
  }

  const keys = await scanKeysByPattern("fc-footy:farcaster-action-log:*");
  if (keys.length === 0) {
    return [];
  }

  const pipeline = redis.pipeline();
  keys.forEach((key) => pipeline.get<FarcasterActionLog[] | null>(key));
  const results = await pipeline.exec();

  const matches: FarcasterActionLog[] = [];
  results.forEach((result) => {
    const candidate =
      result && typeof result === "object" && "data" in (result as Record<string, unknown>)
        ? (result as { data?: unknown }).data
        : result && typeof result === "object" && "result" in (result as Record<string, unknown>)
          ? (result as { result?: unknown }).result
          : result;

    if (!Array.isArray(candidate)) {
      return;
    }

    candidate.forEach((log) => {
      if (log && typeof log === "object" && (log as FarcasterActionLog).fid === fid) {
        matches.push(log as FarcasterActionLog);
      }
    });
  });

  const deduped = matches
    .filter((log, index, list) => list.findIndex((entry) => entry.timestamp === log.timestamp && entry.hash === log.hash && entry.text === log.text) === index)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 50);

  if (deduped.length > 0) {
    await redis.set(actionLogFidKey(fid), deduped);
  }

  return deduped;
}

export async function setSignerSecret(userId: string, signerPublicKey: string, encryptedPrivateKey: string): Promise<void> {
  await redis.set(signerSecretKey(userId, signerPublicKey), encryptedPrivateKey);
}

export async function getSignerSecret(userId: string, signerPublicKey: string): Promise<string | null> {
  return (await redis.get<string>(signerSecretKey(userId, signerPublicKey))) || null;
}

export async function setPendingSignerRequest(request: PendingFootySignerRequest): Promise<void> {
  await redis.set(pendingSignerRequestKey(request.requestId), request);
}

export async function getPendingSignerRequest(requestId: string): Promise<PendingFootySignerRequest | null> {
  return (await redis.get<PendingFootySignerRequest>(pendingSignerRequestKey(requestId))) || null;
}

export async function deletePendingSignerRequest(requestId: string): Promise<void> {
  await redis.del(pendingSignerRequestKey(requestId));
}
