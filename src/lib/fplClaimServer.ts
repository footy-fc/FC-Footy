import { Redis } from '@upstash/redis';
import { keccak256, toUtf8Bytes } from 'ethers';
import { randomBytes } from 'node:crypto';
import {
  FPL_CLAIM_METHOD_FACT_CHALLENGE,
  FPL_CLAIM_SCHEMA_UID,
  FPL_CLAIM_SEASON,
  type FplClaimSummary,
} from '~/lib/fplClaimConstants';

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export type FplClaimRecord = FplClaimSummary;

export type FplChallengeRecord = {
  challengeId: string;
  fid: number;
  entryId: number;
  season: number;
  question: string;
  choices: string[];
  answer: string;
  snapshotHash: string;
  createdAt: string;
  expiresAt: number;
};

export type FplPendingClaim = {
  claimToken: string;
  challengeId: string;
  fid: number;
  entryId: number;
  season: number;
  evidenceHash: string;
  encodedData: string;
  createdAt: string;
  expiresAt: number;
};

function challengeKey(challengeId: string) {
  return `fc-footy:fpl-claim:challenge:${challengeId}`;
}

function pendingKey(claimToken: string) {
  return `fc-footy:fpl-claim:pending:${claimToken}`;
}

function fidClaimKey(season: number, fid: number) {
  return `fc-footy:fpl-claim:fid:${season}:${fid}`;
}

function entryClaimKey(season: number, entryId: number) {
  return `fc-footy:fpl-claim:entry:${season}:${entryId}`;
}

function randomId() {
  return randomBytes(18).toString('hex');
}

export function makeEvidenceHash(input: unknown): string {
  return keccak256(toUtf8Bytes(JSON.stringify(input)));
}

export function getClaimSeason() {
  return FPL_CLAIM_SEASON;
}

export function getClaimSchemaUid() {
  return FPL_CLAIM_SCHEMA_UID;
}

export function getClaimMethod() {
  return FPL_CLAIM_METHOD_FACT_CHALLENGE;
}

export async function getClaimByFid(season: number, fid: number): Promise<FplClaimRecord | null> {
  return (await redis.get<FplClaimRecord>(fidClaimKey(season, fid))) || null;
}

export async function getClaimByEntry(season: number, entryId: number): Promise<FplClaimRecord | null> {
  return (await redis.get<FplClaimRecord>(entryClaimKey(season, entryId))) || null;
}

export async function getClaimsByEntries(season: number, entryIds: number[]) {
  if (entryIds.length === 0) return {} as Record<string, FplClaimRecord>;
  const claims = await redis.mget<FplClaimRecord[]>(...entryIds.map((entryId) => entryClaimKey(season, entryId)));
  return Object.fromEntries(
    entryIds.flatMap((entryId, index) => claims[index] ? [[String(entryId), claims[index]]] : [])
  ) as Record<string, FplClaimRecord>;
}

export async function getClaimStatus(season: number, fid: number, entryId: number) {
  const [byFid, byEntry] = await Promise.all([
    getClaimByFid(season, fid),
    getClaimByEntry(season, entryId),
  ]);

  return {
    season,
    fid,
    entryId,
    byFid,
    byEntry,
    canClaim: !byFid && !byEntry,
    reason: byFid ? (byFid.entryId === entryId ? 'already_claimed' : 'fid_has_claim') : byEntry ? 'entry_has_claim' : null,
  } as const;
}

export async function saveChallenge(record: Omit<FplChallengeRecord, 'challengeId'>) {
  const challengeId = randomId();
  const next = { ...record, challengeId } satisfies FplChallengeRecord;
  await redis.setex(challengeKey(challengeId), Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)), next);
  return next;
}

export async function getChallenge(challengeId: string) {
  return (await redis.get<FplChallengeRecord>(challengeKey(challengeId))) || null;
}

export async function deleteChallenge(challengeId: string) {
  await redis.del(challengeKey(challengeId));
}

export async function savePendingClaim(record: Omit<FplPendingClaim, 'claimToken'>) {
  const claimToken = randomId();
  const next = { ...record, claimToken } satisfies FplPendingClaim;
  await redis.setex(pendingKey(claimToken), Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)), next);
  return next;
}

export async function getPendingClaim(claimToken: string) {
  return (await redis.get<FplPendingClaim>(pendingKey(claimToken))) || null;
}

export async function deletePendingClaim(claimToken: string) {
  await redis.del(pendingKey(claimToken));
}

export async function saveActiveClaim(record: FplClaimRecord): Promise<boolean> {
  const byFid = await redis.set(fidClaimKey(record.season, record.fid), record, { nx: true });
  if (byFid === null) {
    return false;
  }

  const byEntry = await redis.set(entryClaimKey(record.season, record.entryId), record, { nx: true });
  if (byEntry === null) {
    await redis.del(fidClaimKey(record.season, record.fid));
    return false;
  }

  return true;
}

export async function deleteActiveClaim(record: FplClaimRecord): Promise<boolean> {
  const [byFid, byEntry] = await Promise.all([
    getClaimByFid(record.season, record.fid),
    getClaimByEntry(record.season, record.entryId),
  ]);
  if (
    byFid?.attestationUid.toLowerCase() !== record.attestationUid.toLowerCase() ||
    byEntry?.attestationUid.toLowerCase() !== record.attestationUid.toLowerCase()
  ) {
    return false;
  }
  const pipeline = redis.pipeline();
  pipeline.del(fidClaimKey(record.season, record.fid));
  pipeline.del(entryClaimKey(record.season, record.entryId));
  await pipeline.exec();
  return true;
}
