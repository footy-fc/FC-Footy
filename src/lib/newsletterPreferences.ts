import { Redis } from "@upstash/redis";
import {
  FINAL_WHISTLE_NEWSLETTER,
  buildFinalWhistlePreference,
  type FinalWhistleManagerContext,
  type FinalWhistleNewsletterPreference,
} from "~/lib/newsletterModel";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

type SaveFinalWhistleNewsletterPreferenceInput = {
  userId: string;
  fid?: number;
  email: string;
  subscribed: boolean;
  context: FinalWhistleManagerContext | null;
};

function preferenceKey(userId: string) {
  return `fc-footy:newsletter:${FINAL_WHISTLE_NEWSLETTER}:preference:${userId}`;
}

function subscriberIndexKey() {
  return `fc-footy:newsletter:${FINAL_WHISTLE_NEWSLETTER}:subscribers`;
}

async function persistPreference(preference: FinalWhistleNewsletterPreference) {
  const pipeline = redis.pipeline();
  pipeline.set(preferenceKey(preference.userId), preference);

  if (preference.subscribed) {
    pipeline.sadd(subscriberIndexKey(), preference.userId);
  } else {
    pipeline.srem(subscriberIndexKey(), preference.userId);
  }

  await pipeline.exec();
}

export async function getFinalWhistleNewsletterPreference(
  userId: string
): Promise<FinalWhistleNewsletterPreference | null> {
  return (
    (await redis.get<FinalWhistleNewsletterPreference>(preferenceKey(userId))) ||
    null
  );
}

export async function saveFinalWhistleNewsletterPreference(
  input: SaveFinalWhistleNewsletterPreferenceInput
): Promise<FinalWhistleNewsletterPreference> {
  const existing = await getFinalWhistleNewsletterPreference(input.userId);
  const preference = buildFinalWhistlePreference({
    ...input,
    existing,
  });

  await persistPreference(preference);
  return preference;
}

export async function deleteFinalWhistleNewsletterPreference(
  userId: string
): Promise<boolean> {
  const pipeline = redis.pipeline();
  pipeline.del(preferenceKey(userId));
  pipeline.srem(subscriberIndexKey(), userId);
  const results = await pipeline.exec();
  const deleted = results[0];

  return typeof deleted === "number" ? deleted > 0 : Boolean(deleted);
}

export async function getFinalWhistleSubscribers(): Promise<FinalWhistleNewsletterPreference[]> {
  const userIds = await redis.smembers<string[]>(subscriberIndexKey());
  if (userIds.length === 0) return [];

  const preferences = await redis.mget<FinalWhistleNewsletterPreference[]>(
    ...userIds.map(preferenceKey)
  );

  return preferences
    .filter((preference): preference is FinalWhistleNewsletterPreference => Boolean(preference?.subscribed))
    .sort((left, right) => left.email.localeCompare(right.email));
}

export type {
  FinalWhistleManagerContext,
  FinalWhistleNewsletterPreference,
} from "~/lib/newsletterModel";
