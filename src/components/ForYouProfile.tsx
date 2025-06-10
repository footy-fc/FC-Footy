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

type TeamLink = {
  href: string;
  text?: string;
  shortText?: string;
};

const UserProfile: React.FC = () => {
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

  // Initialize SDK and fetch user context

  useEffect(() => {
    
    const initSdkContext = async () => {

      await sdk.isInMiniApp();
      await sdk.actions.ready();
      const context = await sdk.context;
                    console.log('SDK context:', context.user.fid);

      if (!context.user) {
        setError('Please link your Farcaster account to view your profile.');
        return;
      }
      if (context.user) {
        setUserData({
          fid: context.user.fid,
          username: context.user.username || 'Footy Og',
          pfp: context.user.pfpUrl || '/512.png',
        });
      }
    };
    initSdkContext();
  }, []);

  // Fetch user's favorite teams
  const fetchFavoriteTeams = async () => {
    try {
      const context = await sdk.context;
      const currentFid = context.user?.fid;
      if (!currentFid) {
        setError('Please link your Farcaster account to view your profile.');
        return;
      }

      const preferences = await getTeamPreferences(currentFid);
      if (preferences && preferences.length > 0) {
        setFavoriteTeams(preferences);
        setSelectedTeam(preferences[0]);
        setShowSettings(false);
      } else {
        setShowSettings(true);
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
        const currentFid = context.user?.fid;
        if (!currentFid) return;

        const numericFids = fanFids.map(Number);
        const mutualMap = await fetchMutualFollowers(currentFid, numericFids);
        const userDatas = await Promise.all(numericFids.map(fid => fetchFanUserData(fid)));

        const fans = numericFids.reduce<Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>(
          (acc, fid, index) => {
            const userData = userDatas[index];
            const pfp = userData?.USER_DATA_TYPE_PFP?.[0];
            if (pfp) {
              const mutual = mutualMap[fid];
              const youFollow = fid === currentFid;
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
  }, [selectedTeam, cachedTeamFollowers]);

  // Fetch favorite teams on mount
  useEffect(() => {
    fetchFavoriteTeams();
  }, []);

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
        <div>
          <h1 className="text-2xl font-bold text-notWhite">{userData.username || 'Footy Fan'}</h1>
          <p className="text-sm text-lightPurple">Passionate football supporter</p>
        </div>
      </div>

      {/* Favorite Teams Section */}
      {showSettings ? (
        <div className="p-4 border border-dashed border-limeGreen rounded-lg">
          <h2 className="text-notWhite mb-2">Select Your Favorite Teams</h2>
          <SettingsFollowClubs
            onSave={(newFavorites: string[]) => {
              setFavoriteTeams(newFavorites);
              setSelectedTeam(newFavorites[0] ?? null);
              setShowSettings(false);
            }}
          />
          <button
            className="mt-4 bg-deepPink hover:bg-fontRed text-white px-4 py-2 rounded-lg"
            onClick={async () => {
              await sdk.actions.composeCast({
                text: 'Just joined Footy App to connect with fellow fans! ⚽ #FootyApp',
                embeds: [],
              });
            }}
          >
            Share Footy App!
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-notWhite text-lg font-semibold mb-2">Favorite Teams</h2>
          <div className="flex overflow-x-auto gap-3 mb-4">
            {favoriteTeams.map(teamId => (
              <div
                key={teamId}
                onClick={() => setSelectedTeam(teamId)}
                className={`flex-none w-24 p-2 rounded-lg border cursor-pointer text-center ${
                  teamId === selectedTeam
                    ? 'border-limeGreen shadow-[0_0_8px_rgba(173,255,47,0.5)]'
                    : 'border-lightPurple'
                }`}
              >
                <img
                  src={getTeamLogoUrl(teamId)}
                  alt={teamId}
                  className="w-12 h-12 object-contain mx-auto mb-1"
                />
                <span className="text-xs text-lightPurple">{teamId.split('-')[1]}</span>
              </div>
            ))}
            <div
              onClick={() => setShowSettings(true)}
              className="flex-none w-24 border border-dashed border-limeGreen rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-2xl text-limeGreen">+</span>
              <span className="text-xs text-lightPurple">Add Team</span>
            </div>
          </div>

          {/* Team Followers Section */}
          {selectedTeam && favoriteTeams.includes(selectedTeam) && (
            <div className="mt-4">
              <h3 className="text-notWhite font-semibold mb-2">
                {selectedTeam.split('-')[1]} Fans ({fanCount})
              </h3>
              <div className="flex items-center gap-3 text-xs text-lightPurple mb-3">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 ring-2 ring-limeGreen rounded-full"></span>
                  <span>You follow</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 ring-2 ring-fontRed rounded-full"></span>
                  <span>You don’t follow</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 ring-2 ring-purple-500 rounded-full"></span>
                  <span>Mutual</span>
                </div>
              </div>
              {loadingFollowers ? (
                <div className="text-sm text-gray-400 animate-pulse">Loading fans...</div>
              ) : (
                <div className="grid grid-cols-8 gap-2">
                  {favoriteTeamFans.length > 0 ? (
                    favoriteTeamFans.map(fan => (
                      <button
                        key={fan.fid}
                        onClick={() => sdk.actions.viewProfile({ fid: fan.fid })}
                        className="focus:outline-none"
                      >
                        <img
                          src={fan.pfp}
                          alt={`Fan ${fan.fid}`}
                          className={`w-8 h-8 rounded-full ${
                            fan.mutual
                              ? 'ring-2 ring-purple-500'
                              : fan.youFollow
                              ? 'ring-2 ring-limeGreen'
                              : 'ring-2 ring-fontRed'
                          }`}
                        />
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 col-span-8">No fans found for this team.</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Connect with Fans */}
          {selectedTeam && (
            <div className="mt-4 text-center">
              <p className="text-lightPurple text-sm mb-2">
                Connect with fellow {selectedTeam.split('-')[1]} fans!
              </p>
              <button
                disabled={loadingMatches}
                onClick={async () => {
                  try {
                    await sdk.haptics.impactOccurred('heavy');
                  } catch {
                    // Ignore haptics errors
                  }
                  setLoadingMatches(true);
                  const context = await sdk.context;
                  const currentFid = context.user?.fid;
                  const matches = await getAlikeFanMatches(
                    currentFid ? Number(currentFid) : undefined,
                    favoriteTeamFans.map(fan => fan.fid)
                  );
                  setMatchUps(matches);
                  setShowMatchUps(true);
                  setLoadingMatches(false);
                }}
                className={`px-4 py-2 rounded-lg text-white ${
                  loadingMatches ? 'bg-purple-400 cursor-not-allowed' : 'bg-deepPink hover:bg-fontRed'
                }`}
              >
                {loadingMatches ? 'Loading...' : 'Find Similar Fans'}
              </button>
            </div>
          )}

          {/* Similar Fans Section */}
          {showMatchUps && matchUps.length > 0 && (
            <div className="mt-4">
              <h3 className="text-notWhite font-semibold mb-2">Fans Like You</h3>
              <ul className="space-y-2">
                {matchUps.slice(0, 6).map((pair, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <button
                      onClick={() => sdk.actions.viewProfile({ fid: pair.fid2 })}
                      className="focus:outline-none"
                    >
                      <img src={pair.pfp} alt={`Fan ${pair.fid2}`} className="w-8 h-8 rounded-full border" />
                    </button>
                    <div className="flex gap-1">
                      {pair.teamLogos?.map((logo, idx) => (
                        <img key={idx} src={logo} alt="Team" className="w-5 h-5 rounded-md" />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserProfile;