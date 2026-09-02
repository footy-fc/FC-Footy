export const FINAL_WHISTLE_NEWSLETTER = "final-whistle" as const;

export type FinalWhistleManagerContext = {
  entryId: number;
  season: number;
  leagueIds: number[];
  managerLabel?: string;
};

export type FinalWhistleNewsletterPreference = {
  userId: string;
  fid?: number;
  email: string;
  subscribed: boolean;
  source: "footy-profile";
  fplEntryId?: number;
  fplSeason?: number;
  fplLeagueIds: number[];
  managerLabel?: string;
  createdAt: string;
  updatedAt: string;
  consentAt?: string;
  subscribedAt?: string;
  unsubscribedAt?: string;
};

export const normalizeNewsletterEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isValidNewsletterEmail = (email: string) =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

type BuildPreferenceInput = {
  userId: string;
  fid?: number;
  email: string;
  subscribed: boolean;
  context: FinalWhistleManagerContext | null;
  existing?: FinalWhistleNewsletterPreference | null;
  now?: string;
};

export function buildFinalWhistlePreference({
  userId,
  fid,
  email,
  subscribed,
  context,
  existing = null,
  now = new Date().toISOString(),
}: BuildPreferenceInput): FinalWhistleNewsletterPreference {
  const subscriptionChanged = existing?.subscribed !== subscribed;

  return {
    userId,
    ...(fid ? { fid } : {}),
    email,
    subscribed,
    source: "footy-profile",
    fplEntryId: context?.entryId ?? existing?.fplEntryId,
    fplSeason: context?.season ?? existing?.fplSeason,
    fplLeagueIds: context?.leagueIds ?? existing?.fplLeagueIds ?? [],
    managerLabel: context?.managerLabel ?? existing?.managerLabel,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    consentAt: subscribed && (!existing?.consentAt || subscriptionChanged) ? now : existing?.consentAt,
    subscribedAt: subscribed && subscriptionChanged ? now : existing?.subscribedAt,
    unsubscribedAt: !subscribed && subscriptionChanged ? now : subscribed ? undefined : existing?.unsubscribedAt,
  };
}
