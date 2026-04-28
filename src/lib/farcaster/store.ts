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
  const key = actionLogKey(log.userId);
  const existing = (await redis.get<FarcasterActionLog[]>(key)) || [];
  const next = [log, ...existing].slice(0, 50);
  await redis.set(key, next);
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
