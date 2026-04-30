import React, { useState, useEffect } from "react";
import Image from "next/image";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import {
  getTeamPreferences,
  setTeamPreferences,
} from "../lib/kvPerferences";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniAppDetection } from "../hooks/useMiniAppDetection";
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

const appUrl = process.env.NEXT_PUBLIC_URL;
const altImage =`${appUrl}/512.png`

// Helper function to generate a unique ID for each team.
const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

const getSafeMiniAppContext = async () => {
  try {
    await sdk.actions.ready();
    return (await sdk.context) ?? null;
  } catch (error) {
    console.warn("Mini app context unavailable:", error);
    return null;
  }
};

const SettingsFollowClubs: React.FC<SettingsFollowClubsProps> = ({
  onSave,
  viewerFid,
  favoriteTeamIds: favoriteTeamIdsOverride,
}) => {
  const { hasLinkedFarcaster, advanceOnboarding } = useFootyFarcaster();
  const [teams, setTeams] = useState<Team[]>([]);
  const [favTeams, setFavTeams] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loadingTeamIds, setLoadingTeamIds] = useState<string[]>([]);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [hasPromptedMiniApp, setHasPromptedMiniApp] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const { isLoading: isMiniAppLoading } = useMiniAppDetection();

  useEffect(() => {
    const fetchContext = async () => {
      const context = viewerFid ? null : await getSafeMiniAppContext();
      const fid = viewerFid ?? context?.user?.fid;
      setIsInstalled(Boolean(context?.client?.added));
      if (fid) {
        getTeamPreferences(fid)
          .then((teamsFromRedis) => {
            if (teamsFromRedis) {
              setFavTeams(teamsFromRedis);
            }
          })
          .catch((err) => {
            console.error("Error fetching team preferences:", err);
          });
      }
    };
    fetchContext();
    fetchTeamLogos().then((data) => setTeams(data));
  }, [viewerFid]);

  useEffect(() => {
    if (favoriteTeamIdsOverride) {
      setFavTeams(favoriteTeamIdsOverride);
    }
  }, [favoriteTeamIdsOverride]);

  const savePreferences = async (fid: number, updatedFavTeams: string[]) => {
    await setTeamPreferences(fid, updatedFavTeams);
    setFavTeams(updatedFavTeams);
    onSave?.(updatedFavTeams);
    setTransactionError(null);
  };

  const handleRowClick = async (team: Team) => {
    const context = viewerFid ? null : await getSafeMiniAppContext();
    const fid = viewerFid ?? context?.user?.fid;
    if (!fid) {
      console.error("User not authenticated");
      setTransactionError("Connect Farcaster to manage follows and alerts.");
      if (!hasLinkedFarcaster) {
        await advanceOnboarding();
      }
      return;
    }
    const teamId = getTeamId(team);

    // Prevent new clicks if any update is in progress
    if (loadingTeamIds.length > 0) return;

    // Mark this team as loading
    setLoadingTeamIds((prev) => [...prev, teamId]);

    try {
      let updatedFavTeams: string[];

      if (favTeams.includes(teamId)) {
        updatedFavTeams = favTeams.filter((id) => id !== teamId);
      } else {
        updatedFavTeams = [...favTeams, teamId];
      }

      await savePreferences(fid, updatedFavTeams);

      // Prompt to add mini app if this is their first team and the app isn't installed yet
      if (
        !hasPromptedMiniApp && 
        updatedFavTeams.length === 1 && 
        !isInstalled && 
        !isMiniAppLoading
      ) {
        try {
          if (!sdk || !sdk?.actions?.addMiniApp) return;
          await sdk.actions.ready();
          await sdk.actions.addMiniApp();
          setHasPromptedMiniApp(true);
        } catch (error) {
          console.log('User rejected mini app prompt or already has it added', error);
          setHasPromptedMiniApp(true);
        }
      }

      // Clear search term if needed
      if (searchTerm.trim() !== "") {
        setSearchTerm("");
      }
    } catch (error: unknown) {
      console.error("Error updating team preferences:", error);
      if (
        error instanceof Error &&
        error.message.includes("User rejected the request")
      ) {
        setTransactionError("User rejected transaction.");
      } else {
        setTransactionError("Transaction failed. Please try again.");
      }
    } finally {
      // Remove the loading state for this team
      setLoadingTeamIds((prev) => prev.filter((id) => id !== teamId));
    }
  };

  const handleMakeFavorite = async (team: Team) => {
    const context = viewerFid ? null : await getSafeMiniAppContext();
    const fid = viewerFid ?? context?.user?.fid;
    if (!fid) {
      console.error("User not authenticated");
      setTransactionError("Connect Farcaster to manage favorites.");
      if (!hasLinkedFarcaster) {
        await advanceOnboarding();
      }
      return;
    }

    const teamId = getTeamId(team);
    if (!favTeams.includes(teamId) || favTeams[0] === teamId || loadingTeamIds.length > 0) {
      return;
    }

    setLoadingTeamIds((prev) => [...prev, teamId]);
    try {
      const reordered = [teamId, ...favTeams.filter((id) => id !== teamId)];
      await savePreferences(fid, reordered);
    } catch (error) {
      console.error("Error updating favorite team:", error);
      setTransactionError("Could not update favorite team.");
    } finally {
      setLoadingTeamIds((prev) => prev.filter((id) => id !== teamId));
    }
  };

  // Filter teams based on the search term (case-insensitive)
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // When there is no search term, order the teams so that those with notifications appear first.
  const orderedTeams =
    searchTerm.trim() === ""
      ? [...filteredTeams].sort((a, b) => {
          const aFav = favTeams.includes(getTeamId(a));
          const bFav = favTeams.includes(getTeamId(b));
          if (aFav === bFav) return 0;
          return aFav ? -1 : 1;
        })
      : filteredTeams;

  const followedTeams = favTeams
    .slice(1)
    .map((teamId) => teams.find((team) => getTeamId(team) === teamId))
    .filter((team): team is Team => Boolean(team));

  const renderAlertsToggle = (isOn: boolean, isBusy: boolean) => (
    <div
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
        isOn
          ? "border-limeGreenOpacity/35 bg-limeGreenOpacity/20"
          : "border-limeGreenOpacity/18 bg-darkPurple"
      } ${isBusy ? "opacity-60" : ""}`}
      aria-hidden="true"
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-notWhite shadow-sm transition-transform ${
          isOn ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </div>
  );

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="mb-4 space-y-3">

        {followedTeams.length > 0 ? (
          <div className="rounded-[20px] border border-limeGreenOpacity/20 bg-darkPurple/55 p-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-lightPurple/75">Alerts on now</div>
            <div className="flex flex-wrap gap-2">
              {followedTeams.slice(0, 6).map((team) => (
                <button
                  key={getTeamId(team)}
                  type="button"
                  onClick={() => void handleRowClick(team)}
                  disabled={loadingTeamIds.length > 0}
                  className="flex items-center gap-2 rounded-full border border-limeGreenOpacity/20 bg-purplePanel px-3 py-2 text-xs font-medium text-lightPurple transition-colors hover:border-limeGreenOpacity/40 hover:bg-darkPurple disabled:cursor-wait disabled:opacity-60"
                >
                  <Image
                    src={team.logoUrl || altImage}
                    alt={team.name}
                    width={18}
                    height={18}
                    className="rounded-full"
                  />
                  <span className="truncate">{team.name}</span>
                </button>
              ))}
              {followedTeams.length > 6 ? (
                <div className="rounded-full border border-limeGreenOpacity/20 bg-purplePanel px-3 py-2 text-xs font-medium text-lightPurple">
                  +{followedTeams.length - 6} more
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <input
          type="text"
          placeholder="Search clubs or countries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-[16px] border border-limeGreenOpacity/20 bg-darkPurple px-4 py-3 text-sm text-notWhite placeholder:text-lightPurple/60 focus:outline-none focus:ring-2 focus:ring-deepPink/30"
        />
        {favTeams.length > 0 && !isInstalled && (
          <div className="rounded-[16px] border border-limeGreenOpacity/20 bg-gray-800/70 p-3">
            <div className="text-xs text-gray-300">
              Turn on match notifications by adding Footy to your Mini‑Apps.
            </div>
            <div className="mt-2">
              <button
                onClick={async () => {
                  try { await sdk.actions.ready(); await sdk.actions.addMiniApp?.(); } catch (e) { console.warn('addMiniApp failed', e); }
                }}
                className="px-3 py-1 text-xs rounded border border-limeGreenOpacity text-lightPurple hover:bg-deepPink hover:text-white transition-colors"
              >
                Enable match notifications
              </button>
            </div>
          </div>
        )}
        {transactionError && (
          <div className="text-center text-red-500 text-sm">
            {transactionError}
          </div>
        )}
      </div>

      <div className="h-[500px] space-y-2 overflow-y-auto pr-1">
        {favTeams.length === 0 && searchTerm.trim() === "" ? (
          <div className="rounded-[18px] border border-dashed border-limeGreenOpacity/25 bg-darkPurple/60 px-4 py-5 text-sm text-lightPurple">
            Search for a club or country below, turn on alerts, then promote one to your primary badge.
          </div>
        ) : null}

        {orderedTeams.map((team) => {
          const teamId = getTeamId(team);
          const isLoading = loadingTeamIds.includes(teamId);
          const isFollowed = favTeams.includes(teamId);
          const isFavorite = favTeams[0] === teamId;

          return (
            <div
              key={teamId}
              className={`rounded-[18px] border px-4 py-3 transition-colors ${
                isFavorite
                  ? "border-yellow-300/30 bg-[linear-gradient(135deg,rgba(255,215,0,0.08),rgba(30,22,48,0.92))] shadow-[0_0_0_1px_rgba(255,215,0,0.08)]"
                  : isFollowed
                    ? "border-limeGreenOpacity/30 bg-purplePanel"
                    : "border-limeGreenOpacity/15 bg-darkPurple/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {isLoading ? (
                    <Image
                      src="/defifa_spinner.gif"
                      alt="loading"
                      width={34}
                      height={34}
                    />
                  ) : (
                    <Image
                      src={team.logoUrl || altImage}
                      alt={team.name}
                      width={34}
                      height={34}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-notWhite">{team.name}</div>
                    {team.league ? (
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-lightPurple/60">
                        {team.league}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {isFavorite ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-yellow-300/25 bg-yellow-300/10 text-xs font-semibold text-yellow-300">
                      <span aria-hidden="true">★</span>
                    </div>
                  ) : isFollowed ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleMakeFavorite(team);
                      }}
                      disabled={loadingTeamIds.length > 0}
                      aria-label={`Set ${team.name} as primary team`}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-limeGreenOpacity/25 text-xs font-medium text-lightPurple transition-colors hover:bg-darkPurple disabled:cursor-wait disabled:opacity-60"
                    >
                      <span className="text-yellow-300" aria-hidden="true">★</span>
                    </button>
                  ) : (
                    <div className="w-10" />
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isLoading && loadingTeamIds.length === 0) {
                        await handleRowClick(team);
                      }
                    }}
                    disabled={loadingTeamIds.length > 0}
                    className="flex items-center rounded-full px-1 py-1 text-xs font-semibold text-lightPurple transition-opacity disabled:cursor-wait disabled:opacity-60"
                    aria-label={isFollowed ? `Turn alerts off for ${team.name}` : `Turn alerts on for ${team.name}`}
                  >
                    {renderAlertsToggle(isFollowed, isLoading)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsFollowClubs;
