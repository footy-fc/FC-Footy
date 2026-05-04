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

const ProfileIdentityCard: React.FC<ProfileIdentityCardProps> = ({ viewerFid }) => {
  const {
    username,
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
  const fanTier = resolveFanTier(canWrite, favoriteTeamIds.length);

  return (
    <div className="mb-4 overflow-hidden rounded-[24px] border border-limeGreenOpacity/25 bg-[radial-gradient(circle_at_top_left,rgba(255,0,102,0.14),transparent_34%),linear-gradient(145deg,rgba(4,8,24,0.98),rgba(24,18,44,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="app-eyebrow mb-2">Fan Identity</div>
          <h3 className="text-[24px] font-semibold leading-[1.02] text-notWhite sm:text-[28px]">{headlineName}</h3>
          {username ? (
            <p className="mt-1 text-sm text-lightPurple">@{username}</p>
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
        <div className="mx-auto md:mx-0">
          <BadgedProfileAvatar
            pfpUrl={pfpUrl}
            alt={username || "Profile"}
            badgeLogoUrl={favoriteTeam?.logoUrl}
            badgeAlt={favoriteTeam?.name}
            sizeClassName="h-[112px] w-[112px] sm:h-[120px] sm:w-[120px]"
            badgeSize={28}
            className="rounded-full border border-limeGreenOpacity/35 bg-darkPurple p-[6px] shadow-[0_14px_28px_rgba(0,0,0,0.28)]"
            fallbackClassName="text-lightPurple"
          />
        </div>

        <div className="min-w-0">
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
            <div className="inline-flex items-baseline justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-lightPurple/75">Followers</span>
              <span className="text-lg font-semibold text-notWhite">{formatFollowerCount(followerCount)}</span>
            </div>
          </div>
          {favoriteTeam ? (
            <div className="mt-3 rounded-[18px] border border-limeGreenOpacity/20 bg-darkPurple/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Image
                  src={favoriteTeam.logoUrl}
                  alt={favoriteTeam.name}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-notWhite">{favoriteTeam.name}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfileIdentityCard;
