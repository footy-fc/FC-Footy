import React, { useState, useEffect } from "react";
import Image from "next/image";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import {
  getTeamPreferences,
  setTeamPreferences,
  isCountryTeamId,
  isClubTeamId,
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

const getPrimaryByType = (teamIds: string[], type: "club" | "country") =>
  teamIds.find((teamId) => (type === "club" ? isClubTeamId(teamId) : isCountryTeamId(teamId))) ?? null;

const promoteWithinType = (teamIds: string[], targetTeamId: string) => {
  const targetIsCountry = isCountryTeamId(targetTeamId);
  const sameType = teamIds.filter((teamId) =>
    targetIsCountry ? isCountryTeamId(teamId) : isClubTeamId(teamId)
  );
  const otherType = teamIds.filter((teamId) =>
    targetIsCountry ? isClubTeamId(teamId) : isCountryTeamId(teamId)
  );
  const reorderedSameType = [targetTeamId, ...sameType.filter((teamId) => teamId !== targetTeamId)];
  return targetIsCountry ? [...otherType, ...reorderedSameType] : [...reorderedSameType, ...otherType];
};

const getSafeMiniAppContext = async () => {
  try {
    await sdk.actions.ready();
    return (await sdk.context) ?? null;
  } catch (error) {
    console.warn("Mini app context unavailable:", error);
    return null;
  }
};

const deriveClubBio = (teamName: string) =>
  `${teamName} supporter on Footy. Matchday alerts, club banter, and proper football takes.`;

const SettingsFollowClubs: React.FC<SettingsFollowClubsProps> = ({
  onSave,
  viewerFid,
  favoriteTeamIds: favoriteTeamIdsOverride,
}) => {
  const { hasLinkedFarcaster, hasFarcaster, displayName, username, pfpUrl, advanceOnboarding, updateManagedProfile } = useFootyFarcaster();
  const [teams, setTeams] = useState<Team[]>([]);
  const [favTeams, setFavTeams] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loadingTeamIds, setLoadingTeamIds] = useState<string[]>([]);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [hasPromptedMiniApp, setHasPromptedMiniApp] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showProfileSetup, setShowProfileSetup] = useState<boolean>(false);
  const [isSavingProfileSetup, setIsSavingProfileSetup] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>("");
  const [profilePfpUrl, setProfilePfpUrl] = useState<string>("");
  const { isLoading: isMiniAppLoading } = useMiniAppDetection();
  const primaryClubId = getPrimaryByType(favTeams, "club");
  const primaryCountryId = getPrimaryByType(favTeams, "country");
  const primaryClub = primaryClubId ? teams.find((team) => getTeamId(team) === primaryClubId) ?? null : null;

  useEffect(() => {
    setProfileName(displayName || username || "");
  }, [displayName, username]);

  useEffect(() => {
    setProfilePfpUrl(pfpUrl || primaryClub?.logoUrl || "");
  }, [pfpUrl, primaryClub?.logoUrl]);

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

  const syncProfileFromPrimaryClub = async (updatedFavTeams: string[]) => {
    const nextPrimaryClubId = getPrimaryByType(updatedFavTeams, "club");
    if (!nextPrimaryClubId || !hasFarcaster) {
      return;
    }

    const nextPrimaryClub = teams.find((team) => getTeamId(team) === nextPrimaryClubId);
    if (!nextPrimaryClub) {
      return;
    }

    const nextBio = deriveClubBio(nextPrimaryClub.name);
    const missingDisplayName = !(displayName || "").trim();
    const missingPfp = !(pfpUrl || "").trim();

    if (missingDisplayName || missingPfp) {
      setProfileName((current) => current || displayName || username || "");
      setProfilePfpUrl((current) => current || pfpUrl || nextPrimaryClub.logoUrl || "");
      setShowProfileSetup(true);
      return;
    }

    await updateManagedProfile({ bio: nextBio });
  };

  const finalizeProfileSetup = async () => {
    if (!primaryClub) {
      setTransactionError("Pick your club badge first.");
      return;
    }

    const trimmedName = profileName.trim();
    const resolvedPfpUrl = profilePfpUrl.trim() || primaryClub.logoUrl;

    if (!trimmedName) {
      setTransactionError("Add a display name for your Footy Farcaster account.");
      return;
    }

    if (!resolvedPfpUrl) {
      setTransactionError("Choose a profile picture for your Footy Farcaster account.");
      return;
    }

    setIsSavingProfileSetup(true);
    try {
      await updateManagedProfile({
        displayName: trimmedName,
        pfpUrl: resolvedPfpUrl,
        bio: deriveClubBio(primaryClub.name),
      });
      setShowProfileSetup(false);
      setTransactionError(null);
    } catch (error) {
      console.error("Error updating Footy profile:", error);
      setTransactionError(error instanceof Error ? error.message : "Could not update your Footy profile.");
    } finally {
      setIsSavingProfileSetup(false);
    }
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
      await syncProfileFromPrimaryClub(updatedFavTeams);

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

  const followedTeams = favTeams
    .filter((teamId) => teamId !== getPrimaryByType(favTeams, "club") && teamId !== getPrimaryByType(favTeams, "country"))
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
        {showProfileSetup && primaryClub ? (
          <div className="rounded-[20px] border border-deepPink/30 bg-purplePanel/90 p-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-lightPurple/75">Finish your profile</div>
            <div className="mb-3 text-sm leading-6 text-lightPurple">
              Your badge is set. Add the name and profile picture Footy should publish to Farcaster, and we will write a bio for {primaryClub.name}.
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Display name"
                className="w-full rounded-[16px] border border-limeGreenOpacity/20 bg-darkPurple px-4 py-3 text-base text-notWhite placeholder:text-lightPurple/60 focus:outline-none focus:ring-2 focus:ring-deepPink/30"
              />
              <div className="flex items-center gap-3 rounded-[16px] border border-limeGreenOpacity/20 bg-darkPurple px-3 py-3">
                <Image
                  src={profilePfpUrl || primaryClub.logoUrl || altImage}
                  alt={primaryClub.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-lightPurple/70">Profile picture URL</div>
                  <input
                    type="text"
                    value={profilePfpUrl}
                    onChange={(e) => setProfilePfpUrl(e.target.value)}
                    placeholder={primaryClub.logoUrl || "https://..."}
                    className="w-full bg-transparent text-sm text-notWhite placeholder:text-lightPurple/55 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setProfilePfpUrl(primaryClub.logoUrl || "")}
                  className="rounded-full border border-limeGreenOpacity/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-lightPurple transition-colors hover:bg-darkPurple"
                >
                  Use badge
                </button>
              </div>
              <button
                type="button"
                onClick={() => void finalizeProfileSetup()}
                disabled={isSavingProfileSetup}
                className="w-full rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85 disabled:opacity-70"
              >
                {isSavingProfileSetup ? "Publishing your profile" : "Publish Footy profile"}
              </button>
            </div>
          </div>
        ) : null}

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
          className="w-full rounded-[16px] border border-limeGreenOpacity/20 bg-darkPurple px-4 py-3 text-base text-notWhite placeholder:text-lightPurple/60 focus:outline-none focus:ring-2 focus:ring-deepPink/30"
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
            Choose one club as My Club, then follow extra clubs or countries for alerts.
          </div>
        ) : null}

        {orderedTeams.map((team) => {
          const teamId = getTeamId(team);
          const isLoading = loadingTeamIds.includes(teamId);
          const isFollowed = favTeams.includes(teamId);
          const isCountry = isCountryTeamId(teamId);
          const isFavorite = isCountry ? primaryCountryId === teamId : primaryClubId === teamId;
          const favoriteLabel = isCountry ? "Favorite Country" : "My Club";

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
                        if (loadingTeamIds.length > 0) return;
                        const context = viewerFid ? null : await getSafeMiniAppContext();
                        const fid = viewerFid ?? context?.user?.fid;
                        if (!fid) return;
                        const reordered = promoteWithinType(favTeams, teamId);
                        setLoadingTeamIds((prev) => [...prev, teamId]);
                        try {
                          await savePreferences(fid, reordered);
                          await syncProfileFromPrimaryClub(reordered);
                        } catch (error) {
                          console.error("Error updating favorite team:", error);
                          setTransactionError(`Could not update ${isCountry ? "favorite country" : "club badge"}.`);
                        } finally {
                          setLoadingTeamIds((prev) => prev.filter((id) => id !== teamId));
                        }
                      }}
                      disabled={loadingTeamIds.length > 0}
                      aria-label={`Set ${team.name} as ${favoriteLabel}`}
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
              <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-lightPurple/65">
                <span>{isFavorite ? favoriteLabel : isFollowed ? "Following" : "Not following"}</span>
                {!isFavorite && isFollowed ? (
                  <span className="text-yellow-300/85">
                    Tap star to make {isCountry ? "Favorite Country" : "My Club"}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsFollowClubs;
