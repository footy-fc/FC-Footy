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
      await sdk.actions.ready();
      const context = await sdk.context;
      console.log("context now", context);
      const fid = context.user?.fid;
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

  const handleRowClick = async (team: Team) => {
    const context = await sdk.context;
    console.log("context now", context.user);
    const fid = context.user?.fid;
    if (!fid) {
      console.error("User not authenticated");
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
        // Remove team
        updatedFavTeams = favTeams.filter((id) => id !== teamId);
      } else {
        // Add team
        updatedFavTeams = [...favTeams, teamId];
      }

      await setTeamPreferences(fid, updatedFavTeams);
      setFavTeams(updatedFavTeams);
      onSave?.(updatedFavTeams);
      setTransactionError(null); // Clear error on success

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
        <div className="mb-2 text-center text-notWhite font-semibold">
          Favorite Team: {favTeamObj ? favTeamObj.name : favTeams[0]}{" "}
          {favTeamObj && (
            <Image
              src={favTeamObj.logoUrl || altImage}
              alt={favTeamObj.name}
              width={30}
              height={30}
              className="inline-block ml-2"
            />
          )}
        </div>
      )}

      {/* Search input */}
      <div className="mb-4 w-full">
        <input
          type="text"
          placeholder="Search teams..."
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
              return (
                <tr
                  key={teamId}
                  // Only allow row clicks if no row is loading.
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
                    favTeams.includes(teamId) ? "bg-purplePanel" : ""
                  }`}
                >
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-left">
                    <div className="flex items-center space-x-2">
                      <span>{team.name}</span>
                      {favTeams.includes(teamId) && (
                        <span role="img" aria-label="notification" className="ml-2">
                          🔔
                        </span>
                      )}
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
