"use client";

import React from "react";
import Image from "next/image";
import { sdk } from "@farcaster/miniapp-sdk";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { getTeamPreferences } from "../lib/kvPerferences";

interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface AppIdentityBarProps {
  onOpenProfile: () => void;
  onOpenAdmins?: () => void;
  selectedTab: string;
  isAdminFid: boolean;
}

const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

const AppIdentityBar: React.FC<AppIdentityBarProps> = ({
  onOpenProfile,
  onOpenAdmins,
  selectedTab,
  isAdminFid,
}) => {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [favTeams, setFavTeams] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        const fid = context?.user?.fid;
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
  }, []);

  const favoriteTeamId = favTeams[0];
  const favoriteTeam = favoriteTeamId
    ? teams.find((team) => getTeamId(team) === favoriteTeamId)
    : null;
  const followedTeams = favTeams
    .slice(1)
    .map((teamId) => teams.find((team) => getTeamId(team) === teamId))
    .filter((team): team is Team => Boolean(team));

  return (
    <div className="mb-3 flex items-center gap-2 overflow-hidden rounded-[20px] border border-limeGreenOpacity/20 bg-purplePanel/80 px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-deepPink/30 bg-deepPink/15 px-3 py-1 text-[11px] font-semibold text-notWhite">
            {favoriteTeam ? `Favorite: ${favoriteTeam.name}` : "Pick a favorite club"}
          </div>

          {favoriteTeam?.logoUrl ? (
            <Image
              src={favoriteTeam.logoUrl}
              alt={favoriteTeam.name}
              width={22}
              height={22}
              className="rounded-full"
            />
          ) : null}

          {followedTeams.slice(0, 3).map((team) => (
            <Image
              key={getTeamId(team)}
              src={team.logoUrl}
              alt={team.name}
              width={20}
              height={20}
              className="rounded-full border border-darkPurple"
            />
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
        <button
          type="button"
          onClick={onOpenProfile}
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
            selectedTab === "profile"
              ? "border-deepPink bg-deepPink/20 text-notWhite"
              : "border-limeGreenOpacity/20 bg-darkPurple/70 text-lightPurple hover:bg-darkPurple"
          }`}
          aria-label="Open profile"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AppIdentityBar;
