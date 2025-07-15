/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import sdk from '@farcaster/frame-sdk';
import { getTeamPreferences, getFanCountForTeam, getFansForTeam } from '../lib/kvPerferences';
import { getTeamLogo } from './utils/fetchTeamLogos';
import { fetchMutualFollowers } from './utils/fetchCheckIfFollowing';
import SettingsFollowClubs from './SettingsFollowClubs';
import { getAlikeFanMatches } from './utils/getAlikeFanMatches';
import type { FanPair } from './utils/getAlikeFanMatches';
import { fetchFanUserData } from './utils/fetchFCProfile';
import { useMiniAppDetection } from "../hooks/useMiniAppDetection";

type TeamLink = {
  href: string;
  text?: string;
  shortText?: string;
};

interface ForYouProfileProps {
  profileFid?: number; // Optional FID to show instead of current user
  castHash?: string; // Optional cast hash to pass to the invite button
}

const UserProfile: React.FC<ForYouProfileProps> = ({ profileFid, castHash }) => {
  const [userData, setUserData] = useState<{ fid?: number; username?: string; pfp?: string }>({});
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLinks, setTeamLinks] = useState<Record<string, TeamLink[]>>({});
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [fanCount, setFanCount] = useState<number>(0);
  const [favoriteTeamFans, setFavoriteTeamFans] = useState<Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>([]);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cachedTeamFollowers, setCachedTeamFollowers] = useState<Record<string, Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>>({});
  const [showMatchUps, setShowMatchUps] = useState(false);
  const [matchUps, setMatchUps] = useState<FanPair[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
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
        // If viewing someone else's profile and they have no teams, show invite button
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

  // Fetch team followers and mutuals for selected team
  useEffect(() => {
    if (!selectedTeam) return;
    let cancelled = false;

    getFanCountForTeam(selectedTeam.toLowerCase())
      .then(count => !cancelled && setFanCount(count))
      .catch(err => console.error('Error fetching fan count:', err));

    if (cachedTeamFollowers[selectedTeam]) {
      setFavoriteTeamFans(cachedTeamFollowers[selectedTeam]);
      setLoadingFollowers(false);
      return;
    }

    setFavoriteTeamFans([]);
    setShowMatchUps(false);
    setMatchUps([]);
    setLoadingMatches(false);
    setLoadingFollowers(true);

    const fetchFans = async () => {
      try {
        const fanFids = await getFansForTeam(selectedTeam.toLowerCase());
        const context = await sdk.context;
        
        // Determine which FID to use for mutual follower calculations
        // If currentProfileFid is provided, use that (viewing someone else's profile)
        // Otherwise use current user's FID (viewing own profile)
        const profileOwnerFid = currentProfileFid || context.user?.fid;
        if (!profileOwnerFid) return;

        const numericFids = fanFids.map(Number);
        const mutualMap = await fetchMutualFollowers(profileOwnerFid, numericFids);
        const userDatas = await Promise.all(numericFids.map(fid => fetchFanUserData(fid)));

        const fans = numericFids.reduce<Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>(
          (acc, fid, index) => {
            const userData = userDatas[index];
            const pfp = userData?.USER_DATA_TYPE_PFP?.[0];
            if (pfp) {
              const mutual = mutualMap[fid];
              const youFollow = fid === profileOwnerFid;
              acc.push({ fid, pfp, mutual, youFollow });
            }
            return acc;
          },
          []
        );

        if (!cancelled) {
          setCachedTeamFollowers(prev => ({ ...prev, [selectedTeam]: fans }));
          setFavoriteTeamFans(fans);
        }
      } catch (err) {
        console.error('Error fetching fans:', err);
      } finally {
        if (!cancelled) setLoadingFollowers(false);
      }
    };

    fetchFans();
    return () => {
      cancelled = true;
    };
  }, [selectedTeam, cachedTeamFollowers, currentProfileFid]);

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
      setCachedTeamFollowers({}); // Clear cache to refetch with new FID
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
              : 'Passionate football supporter'
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
          <button
            className="mt-4 bg-deepPink hover:bg-fontRed text-white px-4 py-2 rounded-lg"
            onClick={async () => {
              await sdk.actions.composeCast({
                text: 'Just joined Footy App to connect with fellow fans and get match notifications! 💜⚽\n\nShoutout to @kmacb.eth & @gabedev.eth for building this app - my love for the beautiful game is growing faster than my FPL points! 😂\n\nCheck it out: https://fc-footy.vercel.app',
                embeds: [],
              });
            }}
          >
            Share Footy App!
          </button>
        </div>
      ) : favoriteTeams.length === 0 && profileFid ? (
        // Show invite button for cast author with no teams
        <div className="p-4 border border-dashed border-limeGreen rounded-lg text-center">
          <h2 className="text-notWhite mb-2">@{userData.username} hasn&apos;t joined Footy yet!</h2>
          <p className="text-lightPurple mb-4">Invite them to discover their favorite teams and connect with fellow fans.</p>
          <button
            className="bg-deepPink hover:bg-fontRed text-white px-6 py-3 rounded-lg font-semibold"
            onClick={async () => {
              try {
                await sdk.actions.composeCast({
                  text: `Hey @${userData.username} I just discovered your profile on Footy App ⚽️ but you have no favorite teams yet!\n\nJoin me to connect with fellow football fans, track your favorite teams, and get notified when they play!\n\nCheck it out: https://fc-footy.vercel.app`,
                  embeds: [],
                  parent: castHash ? { type: 'cast', hash: castHash } : undefined
                });
              } catch (error) {
                console.error('Error composing cast:', error);
              }
            }}
          >
            Invite to Footy App
          </button>
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

          {/* Team Trophy Case Section */}
          {selectedTeam && (
            <div className="mt-6">
              <h3 className="text-notWhite font-semibold mb-3">
                {viewingOwnProfile ? 'Your' : `${userData.username}'s`} {selectedTeam.split('-')[1].toUpperCase()} Trophy Case
              </h3>
              <div className="p-4 border border-dashed border-limeGreenOpacity rounded-lg text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h4 className="text-notWhite font-medium mb-2">Trophy Case Coming Soon</h4>
                <p className="text-sm text-lightPurple">
                  Collect exclusive {selectedTeam.split('-')[1].toUpperCase()} NFTs and showcase your fandom with unique digital memorabilia.
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