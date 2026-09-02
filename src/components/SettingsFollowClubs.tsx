"use client";

import React from "react";
import Image from "next/image";
import { Bell, Check, Search } from "lucide-react";
import { sdk } from "@farcaster/miniapp-sdk";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { getTeamPreferences, setTeamPreferences } from "../lib/kvPerferences";
import {
  getPrimaryClubPreference,
  isClubPreferenceId,
  makePrimaryClubPreference,
  notifyTeamPreferencesUpdated,
  toggleTeamPreference,
} from "../lib/teamPreferenceModel";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface SettingsFollowClubsProps {
  onSave?: (newFavorites: string[]) => void;
  viewerFid?: number;
  favoriteTeamIds?: string[] | null;
}

const fallbackImage = `${process.env.NEXT_PUBLIC_URL}/512.png`;
const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

const getSafeMiniAppContext = async () => {
  try {
    await sdk.actions.ready();
    return (await sdk.context) ?? null;
  } catch {
    return null;
  }
};

const SettingsFollowClubs: React.FC<SettingsFollowClubsProps> = ({
  onSave,
  viewerFid,
  favoriteTeamIds: favoriteTeamIdsOverride,
}) => {
  const { hasLinkedFarcaster, advanceOnboarding } = useFootyFarcaster();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [favTeams, setFavTeams] = React.useState<string[]>(favoriteTeamIdsOverride ?? []);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [loadingTeamId, setLoadingTeamId] = React.useState<string | null>(null);
  const [transactionError, setTransactionError] = React.useState<string | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const context = viewerFid ? null : await getSafeMiniAppContext();
        const fid = viewerFid ?? context?.user?.fid;
        const [teamData, preferences] = await Promise.all([
          fetchTeamLogos(),
          fid && !favoriteTeamIdsOverride
            ? getTeamPreferences(fid)
            : Promise.resolve(favoriteTeamIdsOverride ?? null),
        ]);

        if (!cancelled) {
          setTeams(teamData);
          setFavTeams(preferences ?? []);
          setIsInstalled(Boolean(context?.client?.added));
        }
      } catch {
        if (!cancelled) {
          setTransactionError("Could not load your clubs. Try again in a moment.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [favoriteTeamIdsOverride, viewerFid]);

  const resolveFid = React.useCallback(async () => {
    if (viewerFid) return viewerFid;
    const context = await getSafeMiniAppContext();
    return context?.user?.fid ?? null;
  }, [viewerFid]);

  const savePreferences = async (updatedFavTeams: string[]) => {
    const fid = await resolveFid();
    if (!fid) {
      setTransactionError("Sign in to save your club and match alerts.");
      if (!hasLinkedFarcaster) await advanceOnboarding();
      return false;
    }

    await setTeamPreferences(fid, updatedFavTeams);
    setFavTeams(updatedFavTeams);
    onSave?.(updatedFavTeams);
    notifyTeamPreferencesUpdated(fid, updatedFavTeams);
    setTransactionError(null);
    return true;
  };

  const updatePreference = async (team: Team, mode: "toggle" | "primary") => {
    const teamId = getTeamId(team);
    if (loadingTeamId) return;

    setLoadingTeamId(teamId);
    try {
      const updated = mode === "primary"
        ? makePrimaryClubPreference(favTeams, teamId)
        : toggleTeamPreference(favTeams, teamId);
      await savePreferences(updated);
    } catch (error) {
      console.error("Error updating team preferences:", error);
      setTransactionError("Could not save that change. Please try again.");
    } finally {
      setLoadingTeamId(null);
    }
  };

  const enableNotifications = async () => {
    setIsEnablingNotifications(true);
    setTransactionError(null);
    try {
      await sdk.actions.ready();
      await sdk.actions.addMiniApp?.();
      setIsInstalled(true);
    } catch {
      setTransactionError("Notifications were not enabled. You can try again when you’re ready.");
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const primaryClubId = getPrimaryClubPreference(favTeams);
  const primaryClub = primaryClubId
    ? teams.find((team) => getTeamId(team) === primaryClubId) ?? null
    : null;
  const followedTeams = favTeams
    .map((teamId) => teams.find((team) => getTeamId(team) === teamId))
    .filter((team): team is Team => Boolean(team));
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const orderedTeams = [...teams]
    .filter((team) => normalizedSearch
      ? team.name.toLowerCase().includes(normalizedSearch)
      : favTeams.includes(getTeamId(team)))
    .sort((a, b) => {
      const aFollowed = favTeams.includes(getTeamId(a));
      const bFollowed = favTeams.includes(getTeamId(b));
      if (aFollowed !== bFollowed) return aFollowed ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, normalizedSearch ? 20 : favTeams.length);

  return (
    <section className="overflow-hidden rounded-[24px] border border-limeGreenOpacity/22 bg-[linear-gradient(145deg,rgba(4,8,24,0.98),rgba(24,18,44,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Your football</div>
        <h3 className="text-xl font-semibold text-notWhite">Clubs & match alerts</h3>
        <p className="mt-1 text-sm leading-6 text-lightPurple">
          My club is part of your Footy identity. Follow any other team or country for match alerts.
        </p>
      </div>

      <div className={`mb-4 rounded-[20px] border p-4 ${primaryClub ? "border-deepPink/30 bg-deepPink/10" : "border-dashed border-lightPurple/25 bg-darkPurple/55"}`}>
        {primaryClub ? (
          <div className="flex items-center gap-3">
            <Image src={primaryClub.logoUrl || fallbackImage} alt={primaryClub.name} width={48} height={48} className="h-12 w-12 rounded-full object-contain" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-deepPink">My club</div>
              <div className="truncate text-base font-semibold text-notWhite">{primaryClub.name}</div>
              <div className="mt-0.5 text-xs text-lightPurple">Shown on your profile</div>
            </div>
            <button type="button" onClick={() => searchInputRef.current?.focus()} className="rounded-full border border-deepPink/30 px-3 py-2 text-xs font-semibold text-notWhite transition-colors hover:bg-deepPink/15">
              Change
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-notWhite">Choose My club</div>
              <div className="mt-1 text-xs leading-5 text-lightPurple">Your badge appears beside your Footy profile.</div>
            </div>
            <button type="button" onClick={() => searchInputRef.current?.focus()} className="shrink-0 rounded-full bg-deepPink px-4 py-2 text-xs font-semibold text-notWhite">
              Choose
            </button>
          </div>
        )}
      </div>

      {followedTeams.length > 0 ? (
        <div className="mb-4 rounded-[18px] border border-limeGreenOpacity/20 bg-darkPurple/55 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-notWhite">
            <Bell className="h-4 w-4 text-limeGreen" aria-hidden="true" />
            Following {followedTeams.length} {followedTeams.length === 1 ? "team" : "teams"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {followedTeams.slice(0, 6).map((team) => (
              <div key={getTeamId(team)} className="flex items-center gap-2 rounded-full border border-lightPurple/15 bg-purplePanel px-2.5 py-1.5 text-xs text-lightPurple">
                <Image src={team.logoUrl || fallbackImage} alt="" width={18} height={18} className="h-[18px] w-[18px] rounded-full object-contain" />
                <span className="max-w-24 truncate">{team.name}</span>
              </div>
            ))}
            {followedTeams.length > 6 ? <div className="rounded-full border border-lightPurple/15 bg-purplePanel px-2.5 py-1.5 text-xs text-lightPurple">+{followedTeams.length - 6}</div> : null}
          </div>
        </div>
      ) : null}

      {favTeams.length > 0 ? (
        <div className={`mb-4 flex items-center justify-between gap-3 rounded-[18px] border px-3 py-3 ${isInstalled ? "border-limeGreenOpacity/25 bg-limeGreenOpacity/10" : "border-lightPurple/15 bg-darkPurple/50"}`}>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-notWhite">{isInstalled ? "Match alerts are ready" : "Get match alerts"}</div>
            <div className="mt-0.5 text-xs leading-5 text-lightPurple">
              {isInstalled ? "We’ll use your Following list for notifications." : "Add Footy to Mini Apps when you want notifications."}
            </div>
          </div>
          {isInstalled ? (
            <Check className="h-5 w-5 shrink-0 text-limeGreen" aria-label="Notifications ready" />
          ) : (
            <button type="button" onClick={() => void enableNotifications()} disabled={isEnablingNotifications} className="shrink-0 rounded-full border border-limeGreenOpacity/30 px-3 py-2 text-xs font-semibold text-notWhite transition-colors hover:bg-limeGreenOpacity/10 disabled:opacity-60">
              {isEnablingNotifications ? "Enabling…" : "Enable"}
            </button>
          )}
        </div>
      ) : null}

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-lightPurple/60" aria-hidden="true" />
        <input ref={searchInputRef} type="search" placeholder="Search clubs or countries" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded-[16px] border border-limeGreenOpacity/20 bg-darkPurple py-3 pl-10 pr-4 text-base text-notWhite placeholder:text-lightPurple/55 focus:outline-none focus:ring-2 focus:ring-deepPink/30" />
      </label>

      {transactionError ? <div role="alert" className="mt-3 rounded-[14px] border border-[#fea282]/25 bg-[#fea282]/10 px-3 py-2 text-sm text-[#ffd7ca]">{transactionError}</div> : null}

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <div className="rounded-[18px] border border-lightPurple/12 bg-darkPurple/50 px-4 py-5 text-sm text-lightPurple">Loading clubs…</div>
        ) : orderedTeams.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-lightPurple/20 bg-darkPurple/50 px-4 py-5 text-sm text-lightPurple">
            {normalizedSearch ? "No clubs or countries match that search." : "Search by name to choose My club or follow a team."}
          </div>
        ) : orderedTeams.map((team) => {
          const teamId = getTeamId(team);
          const isFollowed = favTeams.includes(teamId);
          const isPrimary = primaryClubId === teamId;
          const isClub = isClubPreferenceId(teamId);
          const isBusy = loadingTeamId === teamId;

          return (
            <div key={teamId} className={`rounded-[18px] border px-3 py-3 ${isPrimary ? "border-deepPink/30 bg-deepPink/10" : isFollowed ? "border-limeGreenOpacity/25 bg-purplePanel" : "border-lightPurple/12 bg-darkPurple/55"}`}>
              <div className="flex items-center gap-3">
                <Image src={team.logoUrl || fallbackImage} alt={team.name} width={38} height={38} className="h-[38px] w-[38px] rounded-full object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-notWhite">{team.name}</div>
                  <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-lightPurple/60">{team.league}</div>
                </div>
                <button type="button" onClick={() => void updatePreference(team, "toggle")} disabled={Boolean(loadingTeamId)} aria-pressed={isFollowed} className={`min-w-[78px] rounded-full border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${isFollowed ? "border-limeGreenOpacity/30 bg-limeGreenOpacity/10 text-notWhite" : "border-lightPurple/20 text-lightPurple hover:border-deepPink/35 hover:text-notWhite"}`}>
                  {isBusy ? "Saving…" : isFollowed ? "Following" : "Follow"}
                </button>
              </div>
              {isFollowed && isClub ? (
                <div className="mt-2 flex justify-end border-t border-lightPurple/10 pt-2">
                  {isPrimary ? <span className="text-[11px] font-semibold text-deepPink">My club</span> : (
                    <button type="button" onClick={() => void updatePreference(team, "primary")} disabled={Boolean(loadingTeamId)} className="text-[11px] font-semibold text-lightPurple transition-colors hover:text-notWhite disabled:opacity-60">Make My club</button>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!normalizedSearch ? <p className="mt-3 text-center text-xs text-lightPurple/60">Search to add any club or country.</p> : null}
    </section>
  );
};

export default SettingsFollowClubs;
