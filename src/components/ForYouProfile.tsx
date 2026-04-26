/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { getTeamPreferences } from '../lib/kvPerferences';
import { getTeamLogo } from './utils/fetchTeamLogos';
import SettingsFollowClubs from './SettingsFollowClubs';
import { fetchFanUserData } from './utils/fetchFCProfile';
import { useMiniAppDetection } from "../hooks/useMiniAppDetection";

type TeamLink = {
  href: string;
  text?: string;
  shortText?: string;
};

interface ForYouProfileProps {
  profileFid?: number; // Optional FID to show instead of current user
}

const UserProfile: React.FC<ForYouProfileProps> = ({ profileFid }) => {
  const [userData, setUserData] = useState<{ fid?: number; username?: string; pfp?: string }>({});
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLinks, setTeamLinks] = useState<Record<string, TeamLink[]>>({});
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingOwnProfile, setViewingOwnProfile] = useState<boolean>(!profileFid);
  const [currentProfileFid, setCurrentProfileFid] = useState<number | undefined>(profileFid);
  const [hasPromptedMiniApp, setHasPromptedMiniApp] = useState<boolean>(false);
  const { isMiniApp, isLoading: isMiniAppLoading } = useMiniAppDetection();

  // Initialize SDK and fetch user context
  useEffect(() => {
    const initSdkContext = async () => {
      await sdk.isInMiniApp();
      await sdk.actions.ready();
      const context = await sdk.context;
      console.log('SDK context:', context.user.fid);

      // If we have a profileFid, fetch that user's data
      if (currentProfileFid) {
        try {
          const userData = await fetchFanUserData(currentProfileFid);
          const pfp = userData?.USER_DATA_TYPE_PFP?.[0];
          const username = userData?.USER_DATA_TYPE_USERNAME?.[0];
          
          setUserData({
            fid: currentProfileFid,
            username: username || `FID ${currentProfileFid}`,
            pfp: pfp || '/512.png',
          });
        } catch (error) {
          console.error('Error fetching profile data:', error);
          // Fallback to basic data
          setUserData({
            fid: currentProfileFid,
            username: `FID ${currentProfileFid}`,
            pfp: '/512.png',
          });
        }
      } else if (context.user) {
        setUserData({
          fid: context.user.fid,
          username: context.user.username || 'Footy Og',
          pfp: context.user.pfpUrl || '/512.png',
        });
      } else {
        setError('Please link your Farcaster account to view your profile.');
        return;
      }
    };
    initSdkContext();
  }, [currentProfileFid]);

  // Fetch user's favorite teams
  const fetchFavoriteTeams = async () => {
    try {
      const context = await sdk.context;
      // Use currentProfileFid if provided, otherwise use current user's FID
      const targetFid = currentProfileFid || context.user?.fid;
      if (!targetFid) {
        setError('Please link your Farcaster account to view your profile.');
        return;
      }

      const preferences = await getTeamPreferences(targetFid);
      if (preferences && preferences.length > 0) {
        setFavoriteTeams(preferences);
        setSelectedTeam(preferences[0]);
        setShowSettings(false);
      } else {
        // If viewing someone else's profile and they have no teams, keep settings hidden
        if (currentProfileFid && currentProfileFid !== context.user?.fid) {
          setShowSettings(false); // Don't show settings for other users
        } else {
          setShowSettings(true);
        }
      }
    } catch (err) {
      console.error('Error fetching team preferences:', err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch favorite teams on mount
  useEffect(() => {
    fetchFavoriteTeams();
  }, [currentProfileFid]);

  // Fetch team links for favorite teams
  useEffect(() => {
    if (favoriteTeams.length === 0) return;

    const leagueMap: Record<string, string[]> = {};
    favoriteTeams.forEach(teamId => {
      const [league, abbr] = teamId.split('-');
      if (!leagueMap[league]) leagueMap[league] = [];
      leagueMap[league].push(abbr);
    });

    Object.entries(leagueMap).forEach(([league, abbrs]) => {
      fetchTeamLinksByLeague(league, abbrs);
    });
  }, [favoriteTeams]);

  const fetchTeamLinksByLeague = async (league: string, teamAbbrs: string[]) => {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams`);
      const data = await res.json();
      const teams = data?.sports?.[0]?.leagues?.[0]?.teams || [];

      const newLinks: Record<string, TeamLink[]> = {};
      teamAbbrs.forEach(abbr => {
        const matched = teams.find((t: { team: { abbreviation: string } }) => t.team.abbreviation.toLowerCase() === abbr.toLowerCase());
        if (matched?.team?.links) {
          newLinks[abbr] = matched.team.links;
        }
      });

      setTeamLinks(prev => ({ ...prev, ...newLinks }));
    } catch (err) {
      console.error(`Failed to fetch team links for league ${league}`, err);
    }
  };

  const getTeamLogoUrl = (teamId: string): string => {
    const [league, abbr] = teamId.split('-');
    return getTeamLogo(abbr, league);
  };

  // Function to toggle back to user's own profile
  const toggleToOwnProfile = async () => {
    const context = await sdk.context;
    if (context.user?.fid) {
      setCurrentProfileFid(undefined);
      setViewingOwnProfile(true);
      setFavoriteTeams([]);
      setSelectedTeam(null);
      setLoading(true);
      // fetchFavoriteTeams will be called automatically by the useEffect
    }
  };

  if (loading) return <div className="text-center text-gray-400">Loading profile...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="bg-purplePanel text-lightPurple rounded-lg p-4 max-w-2xl mx-auto">
      {/* User Profile Header */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={userData.pfp || '/default-avatar.png'}
          alt="Profile"
          className="w-16 h-16 rounded-full border-2 border-limeGreen"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-notWhite">{userData.username || 'Footy Fan'}</h1>
          <p className="text-sm text-lightPurple">
            {favoriteTeams.length > 0 
              ? `Passionate ${favoriteTeams[0].split('-')[1].toUpperCase()} supporter${favoriteTeams.length > 1 ? ` & ${favoriteTeams.length - 1} other team(s)` : ''}`
              : "No badge, no pride.🤦‍♂️ You’re moving slower than Maguire in quicksand."
            }
          </p>
        </div>
        {/* Toggle button - only show when viewing someone else's profile */}
        {!viewingOwnProfile && (
          <button
            onClick={toggleToOwnProfile}
            className="text-xs bg-limeGreen text-black px-3 py-1 rounded-full hover:bg-green-300 transition-colors"
            title="View my profile"
          >
            My Profile
          </button>
        )}
      </div>

      {/* Favorite Teams Section */}
      {showSettings ? (
        <div className="p-4 border border-dashed border-limeGreen rounded-lg">
          <h2 className="text-notWhite mb-2">Select Your Favorite Teams</h2>
          <SettingsFollowClubs
            onSave={async (newFavorites: string[]) => {
              setFavoriteTeams(newFavorites);
              setSelectedTeam(newFavorites[0] ?? null);
              setShowSettings(false);
              
              // Prompt to add mini app if this is their first team and they're not already in a mini app
              if (
                !hasPromptedMiniApp && 
                newFavorites.length === 1 && 
                !isMiniApp && 
                !isMiniAppLoading
              ) {
                try {
                  await sdk.actions.addMiniApp();
                  setHasPromptedMiniApp(true);
                } catch (error) {
                  console.log('User rejected mini app prompt or already has it added');
                  setHasPromptedMiniApp(true);
                }
              }
            }}
          />
        </div>
      ) : favoriteTeams.length === 0 && profileFid ? (
        <div className="p-4 border border-dashed border-limeGreen rounded-lg text-center">
          <h2 className="text-notWhite mb-2">@{userData.username} hasn&apos;t joined Footy yet!</h2>
          <p className="text-lightPurple">They haven&apos;t picked any favorite teams yet.</p>
        </div>
      ) : (
        <>
          <h2 className="text-notWhite text-lg font-semibold mb-2">
            {favoriteTeams.length === 0 ? 'Select Team' : 'Follows'}
          </h2>
          <div className="flex overflow-x-auto gap-4 mb-4">
            {favoriteTeams.map(teamId => (
              <div
                key={teamId}
                onClick={() => setSelectedTeam(teamId)}
                className={`relative flex-none w-[120px] border ${
                  teamId === selectedTeam
                    ? "border-limeGreenOpacity shadow-[0_0_10px_2px_rgba(173,255,47,0.5)]"
                    : "border-lightPurple"
                } rounded-lg p-2 text-center bg-purplePanel cursor-pointer`}
              >
                <img
                  src={getTeamLogoUrl(teamId)}
                  alt={teamId}
                  className="w-[60px] h-[60px] object-contain mb-2 mx-auto"
                />
                <span className="text-xs text-lightPurple">{teamId.split('-')[1].toUpperCase()}</span>
              </div>
            ))}
            {/* Only show Add Team button when viewing own profile */}
            {viewingOwnProfile && (
              <div
                onClick={() => setShowSettings(true)}
                className="flex-none w-[120px] border border-dashed border-limeGreenOpacity rounded-lg p-2 text-center bg-purplePanel cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-2xl text-limeGreen">+</span>
                <span className="text-xs text-lightPurple">Add Team</span>
              </div>
            )}
          </div>

          {/* Trophy Case Section */}
          {selectedTeam && (
            <div className="mt-6">
              <h3 className="text-notWhite font-semibold mb-3">
                {viewingOwnProfile ? 'Your' : `${userData.username}'s`} Trophy Case
              </h3>
              <div className="p-4 border border-dashed border-limeGreenOpacity rounded-lg text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h4 className="text-notWhite font-medium mb-2">Trophy Case Coming Soon</h4>
                <p className="text-sm text-lightPurple">
                  Collect exclusive Fantasy season passes, contest rewards, and Footy collectibles to showcase your achievements across FEPL and other games.
                </p>
                <p className="text-xs text-gray-400 mt-1 italic">
                  No silverware yet — that shelf&apos;s as empty as a Big Ears spot for half the Prem. Keep grinding.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 opacity-50">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-700 rounded-lg p-2 aspect-square flex items-center justify-center">
                      <span className="text-xs text-gray-400">NFT {i}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserProfile;
