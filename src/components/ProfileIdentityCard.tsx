"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Image from "next/image";
import { sdk } from "@farcaster/miniapp-sdk";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";
import { resolveFanTier } from "~/lib/fanclubs/fanTier";
import { getTeamPreferences } from "../lib/kvPerferences";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import BadgedProfileAvatar from "./BadgedProfileAvatar";

interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface ProfileIdentityCardProps {
  viewerFid?: number;
  bio?: string;
  onEditPfp?: () => void;
  isEditingUsername?: boolean;
  usernameDraft?: string;
  usernameError?: string | null;
  usernameMeta?: string | null;
  isSavingUsername?: boolean;
  onUsernameDraftChange?: (value: string) => void;
  onStartUsernameEdit?: () => void;
  onCancelUsernameEdit?: () => void;
  onSaveUsername?: () => void;
  isEditingDisplayName?: boolean;
  displayNameDraft?: string;
  displayNameError?: string | null;
  displayNameMeta?: string | null;
  isSavingDisplayName?: boolean;
  onDisplayNameDraftChange?: (value: string) => void;
  onStartDisplayNameEdit?: () => void;
  onCancelDisplayNameEdit?: () => void;
  onSaveDisplayName?: () => void;
  isEditingBio?: boolean;
  bioDraft?: string;
  bioError?: string | null;
  bioMeta?: string | null;
  isSavingBio?: boolean;
  onBioDraftChange?: (value: string) => void;
  onStartBioEdit?: () => void;
  onCancelBioEdit?: () => void;
  onSaveBio?: () => void;
}

const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

const getSafeMiniAppContext = async () => {
  try {
    await sdk.actions.ready();
    return (await sdk.context) ?? null;
  } catch {
    return null;
  }
};

const formatFollowerCount = (count?: number) => {
  if (typeof count !== "number" || Number.isNaN(count)) {
    return "—";
  }

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(count >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  }

  return count.toString();
};

const ProfileIdentityCard: React.FC<ProfileIdentityCardProps> = ({
  viewerFid,
  bio,
  onEditPfp,
  isEditingUsername = false,
  usernameDraft = "",
  usernameError = null,
  usernameMeta = null,
  isSavingUsername = false,
  onUsernameDraftChange,
  onStartUsernameEdit,
  onCancelUsernameEdit,
  onSaveUsername,
  isEditingDisplayName = false,
  displayNameDraft = "",
  displayNameError = null,
  displayNameMeta = null,
  isSavingDisplayName = false,
  onDisplayNameDraftChange,
  onStartDisplayNameEdit,
  onCancelDisplayNameEdit,
  onSaveDisplayName,
  isEditingBio = false,
  bioDraft = "",
  bioError = null,
  bioMeta = null,
  isSavingBio = false,
  onBioDraftChange,
  onStartBioEdit,
  onCancelBioEdit,
  onSaveBio,
}) => {
  const {
    username,
    proofUsername,
    displayName,
    pfpUrl,
    followerCount,
    canWrite,
  } = useFootyFarcaster();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [favoriteTeamIds, setFavoriteTeamIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const context = viewerFid ? null : await getSafeMiniAppContext();
        const fid = viewerFid ?? context?.user?.fid;
        const [teamData, preferences] = await Promise.all([
          fetchTeamLogos(),
          fid ? getTeamPreferences(fid) : Promise.resolve<string[] | null>(null),
        ]);

        if (!cancelled) {
          setTeams(teamData);
          setFavoriteTeamIds(preferences ?? []);
        }
      } catch {
        if (!cancelled) {
          setTeams([]);
          setFavoriteTeamIds([]);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [viewerFid]);

  const favoriteTeamId = favoriteTeamIds[0];
  const favoriteTeam = favoriteTeamId
    ? teams.find((team) => getTeamId(team) === favoriteTeamId)
    : null;

  const headlineName = displayName || username || "Footy supporter";
  const hasUsername = Boolean(username && username.trim().length > 0);
  const pendingUsername = !hasUsername && proofUsername ? `@${proofUsername}` : null;
  const fanTier = resolveFanTier(canWrite, favoriteTeamIds.length);

  return (
    <div className="mb-4 overflow-hidden rounded-[24px] border border-limeGreenOpacity/25 bg-[radial-gradient(circle_at_top_left,rgba(255,0,102,0.14),transparent_34%),linear-gradient(145deg,rgba(4,8,24,0.98),rgba(24,18,44,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="app-eyebrow mb-2">Farcaster Profile</div>
          {isEditingDisplayName ? (
            <div className="max-w-[340px]">
              <input
                type="text"
                value={displayNameDraft}
                onChange={(event) => onDisplayNameDraftChange?.(event.target.value)}
                placeholder="Your display name"
                className="w-full rounded-[18px] border border-limeGreenOpacity/20 bg-darkPurple px-4 py-3 text-[24px] font-semibold leading-[1.02] text-notWhite placeholder:text-lightPurple/55 focus:outline-none focus:ring-2 focus:ring-deepPink/30 sm:text-[28px]"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className={`text-[11px] leading-5 ${displayNameError ? 'text-[#ffd7ca]' : 'text-lightPurple/72'}`}>
                  {displayNameError || displayNameMeta || 'Shown as your primary Footy name'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCancelDisplayNameEdit}
                    className="rounded-full border border-limeGreenOpacity/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lightPurple transition-colors hover:bg-darkPurple"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveDisplayName}
                    disabled={isSavingDisplayName || Boolean(displayNameError)}
                    className="rounded-full bg-deepPink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-notWhite transition-colors hover:bg-deepPink/85 disabled:opacity-70"
                  >
                    {isSavingDisplayName ? 'Saving' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartDisplayNameEdit}
              className="text-left transition-opacity hover:opacity-85"
            >
              <h3 className="text-[24px] font-semibold leading-[1.02] text-notWhite sm:text-[28px]">{headlineName}</h3>
            </button>
          )}

          {isEditingUsername ? (
            <div className="mt-2 max-w-[340px]">
              <div className="flex items-center overflow-hidden rounded-full border border-lightPurple/12 bg-darkPurple/45">
                <span className="pl-4 text-sm text-lightPurple">@</span>
                <input
                  type="text"
                  value={usernameDraft}
                  onChange={(event) => onUsernameDraftChange?.(event.target.value)}
                  placeholder="yourname.eth"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-transparent px-1 py-2 pr-4 text-sm text-notWhite placeholder:text-lightPurple/55 focus:outline-none"
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className={`text-[11px] leading-5 ${usernameError ? 'text-[#ffd7ca]' : 'text-lightPurple/72'}`}>
                  {usernameError || usernameMeta || 'Use a claimed root .eth Farcaster username'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCancelUsernameEdit}
                    className="rounded-full border border-limeGreenOpacity/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lightPurple transition-colors hover:bg-darkPurple"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveUsername}
                    disabled={isSavingUsername || Boolean(usernameError)}
                    className="rounded-full bg-deepPink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-notWhite transition-colors hover:bg-deepPink/85 disabled:opacity-70"
                  >
                    {isSavingUsername ? 'Saving' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartUsernameEdit}
              className="mt-1 rounded-full border border-lightPurple/12 bg-darkPurple/45 px-3 py-1 text-sm text-lightPurple transition-colors hover:border-deepPink/30 hover:bg-darkPurple"
            >
              {hasUsername ? `@${username}` : pendingUsername || 'Set @name'}
            </button>
          )}
          {!hasUsername && pendingUsername ? (
            <div className="mt-2 text-[11px] leading-5 text-lightPurple/72">
              Username proof exists. Waiting for Farcaster username data to propagate.
            </div>
          ) : null}
        </div>
        <div className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
          fanTier.tone === "active"
            ? "bg-limeGreenOpacity/20 text-limeGreen"
            : fanTier.tone === "starter"
              ? "bg-[#fea282]/15 text-[#fea282]"
              : "bg-deepPink/20 text-notWhite"
        }`}>
          {fanTier.label}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[132px_minmax(0,1fr)] md:items-start">
        <button
          type="button"
          onClick={onEditPfp}
          className="group mx-auto rounded-full md:mx-0"
        >
          <BadgedProfileAvatar
            pfpUrl={pfpUrl}
            alt={username || "Profile"}
            badgeLogoUrl={favoriteTeam?.logoUrl}
            badgeAlt={favoriteTeam?.name}
            sizeClassName="h-[112px] w-[112px] sm:h-[120px] sm:w-[120px]"
            badgeSize={28}
            className="rounded-full border border-limeGreenOpacity/35 bg-darkPurple p-[6px] shadow-[0_14px_28px_rgba(0,0,0,0.28)] transition-transform group-hover:scale-[1.02]"
            fallbackClassName="text-lightPurple"
          />
        </button>

        <div className="min-w-0">
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
            <div className="inline-flex items-baseline justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-lightPurple/75">Followers</span>
              <span className="text-lg font-semibold text-notWhite">{formatFollowerCount(followerCount)}</span>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-limeGreenOpacity/20 bg-darkPurple/60 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-lightPurple/70">Bio</div>
              {isEditingBio ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCancelBioEdit}
                    className="rounded-full border border-limeGreenOpacity/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lightPurple transition-colors hover:bg-darkPurple"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveBio}
                    disabled={isSavingBio}
                    className="rounded-full bg-deepPink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-notWhite transition-colors hover:bg-deepPink/85 disabled:opacity-70"
                  >
                    {isSavingBio ? "Saving" : "Save"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onStartBioEdit}
                  className="rounded-full border border-limeGreenOpacity/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lightPurple transition-colors hover:bg-darkPurple"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingBio ? (
              <div>
                <textarea
                  value={bioDraft}
                  onChange={(event) => onBioDraftChange?.(event.target.value)}
                  placeholder="Tell Footy who you support."
                  rows={3}
                  className="w-full rounded-[16px] border border-limeGreenOpacity/20 bg-darkPurple px-4 py-3 text-base text-notWhite placeholder:text-lightPurple/60 focus:outline-none focus:ring-2 focus:ring-deepPink/30"
                />
                <div className={`mt-3 text-sm leading-6 ${bioError ? 'text-[#ffd7ca]' : 'text-lightPurple/72'}`}>
                  {bioError || bioMeta || 'Keep it tight and recognizable'}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartBioEdit}
                className="w-full text-left transition-colors hover:text-notWhite"
              >
                <div className="text-sm leading-6 text-notWhite">
                  {bio && bio.trim().length > 0 ? bio : "Tap to add a sharper Footy bio."}
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileIdentityCard;
