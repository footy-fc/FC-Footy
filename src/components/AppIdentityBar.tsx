"use client";

import React from "react";
import Image from "next/image";
import { sdk } from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { getTeamPreferences } from "../lib/kvPerferences";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface AppIdentityBarProps {
  onOpenProfile: () => void;
  onOpenAdmins?: () => void;
  onOpenTeam?: (teamId: string) => void;
  selectedTab: string;
  isAdminFid: boolean;
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

const AppIdentityBar: React.FC<AppIdentityBarProps> = ({
  onOpenProfile,
  onOpenAdmins,
  onOpenTeam,
  selectedTab,
  isAdminFid,
  viewerFid,
}) => {
  const { ready, authenticated, login } = usePrivy();
  const { hasSigner, pfpUrl, username } = useFootyFarcaster();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [favTeams, setFavTeams] = React.useState<string[]>([]);

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
          setFavTeams(preferences ?? []);
        }
      } catch {
        if (!cancelled) {
          setTeams([]);
          setFavTeams([]);
        }
      }
    };

    load();

    const handleFocus = () => load();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
    };
  }, [viewerFid]);

  const favoriteTeamId = favTeams[0];
  const favoriteTeam = favoriteTeamId
    ? teams.find((team) => getTeamId(team) === favoriteTeamId)
    : null;
  const followedTeams = favTeams
    .slice(1)
    .map((teamId) => teams.find((team) => getTeamId(team) === teamId))
    .filter((team): team is Team => Boolean(team));
  const showLoginButton = ready && !authenticated;

  return (
    <div className="mb-3 flex items-center gap-2 overflow-hidden rounded-[20px] border border-limeGreenOpacity/20 bg-purplePanel/80 px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          {!favoriteTeam ? (
            <div className="rounded-full border border-deepPink/30 bg-deepPink/15 px-3 py-1 text-[11px] font-semibold text-notWhite">
              Pick a favorite club
            </div>
          ) : null}

          {favoriteTeam?.logoUrl ? (
            <button
              type="button"
              onClick={() => onOpenTeam?.(favoriteTeamId)}
              className="shrink-0 rounded-full transition-transform hover:scale-105"
              aria-label={`Open ${favoriteTeam.name} in Fan Clubs`}
            >
              <Image
                src={favoriteTeam.logoUrl}
                alt={favoriteTeam.name}
                width={22}
                height={22}
                className="rounded-full"
              />
            </button>
          ) : null}

          {followedTeams.slice(0, 3).map((team) => (
            <button
              key={getTeamId(team)}
              type="button"
              onClick={() => onOpenTeam?.(getTeamId(team))}
              className="shrink-0 rounded-full border border-darkPurple transition-transform hover:scale-105"
              aria-label={`Open ${team.name} in Fan Clubs`}
            >
              <Image
                src={team.logoUrl}
                alt={team.name}
                width={20}
                height={20}
                className="rounded-full"
              />
            </button>
          ))}

          {followedTeams.length > 3 ? (
            <div className="rounded-full bg-darkPurple/70 px-2 py-1 text-[10px] font-semibold text-lightPurple">
              +{followedTeams.length - 3}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isAdminFid && onOpenAdmins ? (
          <button
            type="button"
            onClick={onOpenAdmins}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
              selectedTab === "admins"
                ? "border-deepPink bg-deepPink/20 text-notWhite"
                : "border-limeGreenOpacity/20 bg-darkPurple/70 text-lightPurple hover:bg-darkPurple"
            }`}
            aria-label="Open admin dashboard"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
              <path d="M9.5 12l1.5 1.5 3.5-3.5" />
            </svg>
          </button>
        ) : null}
        {showLoginButton ? (
          <button
            type="button"
            onClick={login}
            className="rounded-2xl border border-deepPink/35 bg-deepPink/18 px-4 py-2 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/28"
          >
            Sign in
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenProfile}
            className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border transition-colors ${
              selectedTab === "profile"
                ? "border-deepPink bg-deepPink/20 text-notWhite"
                : hasSigner
                  ? "border-limeGreenOpacity/35 bg-darkPurple/70 text-lightPurple hover:bg-darkPurple"
                  : "border-limeGreenOpacity/20 bg-darkPurple/70 text-lightPurple hover:bg-darkPurple"
            }`}
            aria-label={username ? `Open profile for @${username}` : "Open profile"}
          >
            {pfpUrl ? (
              <Image
                src={pfpUrl}
                alt={username || "Profile"}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
            {hasSigner ? (
              <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-darkPurple bg-limeGreenOpacity text-darkPurple">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l4 4L19 6" />
                </svg>
              </span>
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
};

export default AppIdentityBar;
