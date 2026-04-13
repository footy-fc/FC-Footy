import React, { useState, useEffect } from "react";
import Image from "next/image";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import {
  getTeamPreferences,
  setTeamPreferences,
} from "../lib/kvPerferences";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniAppDetection } from "../hooks/useMiniAppDetection";

interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface SettingsFollowClubsProps {
  onSave?: (newFavorites: string[]) => void;
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

const SettingsFollowClubs: React.FC<SettingsFollowClubsProps> = ({ onSave }) => {
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
      const context = await getSafeMiniAppContext();
      const fid = context?.user?.fid;
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
  }, []);

  const savePreferences = async (fid: number, updatedFavTeams: string[]) => {
    await setTeamPreferences(fid, updatedFavTeams);
    setFavTeams(updatedFavTeams);
    onSave?.(updatedFavTeams);
    setTransactionError(null);
  };

  const handleRowClick = async (team: Team) => {
    const context = await getSafeMiniAppContext();
    const fid = context?.user?.fid;
    if (!fid) {
      console.error("User not authenticated");
      setTransactionError("Open this in Farcaster to manage follows and alerts.");
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
    const context = await getSafeMiniAppContext();
    const fid = context?.user?.fid;
    if (!fid) {
      console.error("User not authenticated");
      setTransactionError("Open this in Farcaster to manage favorites.");
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

  // Lookup the full team object for the first favorite team (if any).
  const favTeamObj =
    favTeams.length > 0
      ? teams.find((team) => getTeamId(team) === favTeams[0])
      : null;

  return (
    <div className="w-full h-full overflow-y-auto">
      {favTeams.length > 0 && (
        <div className="mb-3 rounded-lg border border-limeGreenOpacity bg-purplePanel p-3">
          <div className="text-notWhite font-semibold mb-1">Favorite team</div>
          <div className="text-sm text-lightPurple mb-2">
            Your favorite team anchors your profile. Every followed team still receives score alerts.
          </div>
          <div className="flex items-center gap-2 text-notWhite font-semibold">
            <span>{favTeamObj ? favTeamObj.name : favTeams[0]}</span>
            {favTeamObj && (
              <Image
                src={favTeamObj.logoUrl || altImage}
                alt={favTeamObj.name}
                width={30}
                height={30}
                className="inline-block"
              />
            )}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="mb-4 w-full">
        <input
          type="text"
          placeholder="Search clubs or countries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-darkPurple p-2 border rounded-md border-limeGreenOpacity focus:outline-none focus:ring-2 focus:ring-darkPurple"
        />
        {/* Notification affordance when not installed */}
        {favTeams.length > 0 && !isInstalled && (
          <div className="mt-2 p-2 bg-gray-800/70 border border-gray-700 rounded">
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
          <div className="text-center text-red-500 text-sm mb-2">
            {transactionError}
          </div>
        )}
      </div>

      {/* Scrollable table container */}
      <div className="w-full h-[500px] overflow-y-auto">
        <table className="w-full bg-darkPurple">
          {favTeams.length === 0 && (
            <thead className="bg-darkPurple">
              <tr className="text-fontRed text-center border-b border-limeGreenOpacity">
                <th className="py-1 text-left font-medium">
                  Select your favorite team first
                </th>
                <th className="py-1 text-center font-medium"></th>
                <th className="py-1 text-right font-medium"></th>
              </tr>
            </thead>
          )}
          <tbody>
            {orderedTeams.map((team) => {
              const teamId = getTeamId(team);
              const isLoading = loadingTeamIds.includes(teamId);
              const isFollowed = favTeams.includes(teamId);
              const isFavorite = favTeams[0] === teamId;
              return (
                <tr
                  key={teamId}
                  onClick={async () => {
                    if (!isLoading && loadingTeamIds.length === 0) {
                      try {
                        await sdk.haptics.impactOccurred('medium');
                      } catch {
                        // ignore haptics errors
                      }
                      handleRowClick(team);
                    }
                  }}
                  className={`hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer ${
                    isFollowed ? "bg-purplePanel" : ""
                  }`}
                >
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-left">
                    <div className="flex items-center space-x-2">
                      <span>{team.name}</span>
                      {isFavorite && <span className="text-yellow-300 text-xs">★ Favorite</span>}
                      {isFollowed && !isFavorite && <span className="text-xs text-lightPurple">Alerts on</span>}
                    </div>
                  </td>
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-center">
                    {isLoading ? (
                      <Image
                        src="/defifa_spinner.gif"
                        alt="loading"
                        width={30}
                        height={30}
                      />
                    ) : (
                      <Image
                        src={team.logoUrl || altImage}
                        alt={team.name}
                        width={30}
                        height={30}
                      />
                    )}
                  </td>
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-right">
                    {isFollowed && !isFavorite ? (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleMakeFavorite(team);
                        }}
                        className="text-xs rounded border border-limeGreenOpacity px-2 py-1 hover:bg-deepPink hover:text-white transition-colors"
                      >
                        Make favorite
                      </button>
                    ) : isFavorite ? (
                      <span className="text-xs text-yellow-300">Primary</span>
                    ) : (
                      <span className="text-xs text-gray-500">Follow</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsFollowClubs;
