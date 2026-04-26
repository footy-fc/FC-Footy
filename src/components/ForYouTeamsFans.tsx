import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';
import { getTeamPreferences, getFanCountForTeam, getFansForTeam } from "../lib/kvPerferences";
import { getTeamLogo } from "./utils/fetchTeamLogos";
import { fetchFollowingStatuses } from './utils/fetchCheckIfFollowing';
import SettingsFollowClubs from './SettingsFollowClubs';
import type { FanPair } from "./utils/getAlikeFanMatches";
import { fetchFanUserData } from './utils/fetchFCProfile';

type TeamLink = {
  href: string;
  text?: string;
  shortText?: string;
};

const ForYouTeamsFans: React.FC = () => {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [currentFid, setCurrentFid] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLinks, setTeamLinks] = useState<Record<string, TeamLink[]>>({});
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [favoriteTeamFans, setFavoriteTeamFans] = useState<Array<{ fid: number; pfp: string; youFollow: boolean; username?: string }>>([]);
  const [fanCount, setFanCount] = useState<number>(0);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cachedTeamFollowers, setCachedTeamFollowers] = useState<Record<string, Array<{ fid: number; pfp: string; youFollow: boolean; username?: string }>>>({});
  const [showMatchUps, setShowMatchUps] = useState(false);
  const [matchUps, setMatchUps] = useState<FanPair[]>([]);

  const fetchFavoriteTeams = async () => {
    try {
      const context = await sdk.context;
      console.log('context now', context.user);
      const ctxFid = context.user?.fid;
      setCurrentFid(ctxFid ? Number(ctxFid) : null);

      if (!ctxFid) {
        setError("You need to link your Farcaster account to see your favorite teams.");
        return;
      }

      const preferences = await getTeamPreferences(Number(ctxFid));
      if (preferences && preferences.length > 0) {
        // console.log("Fetched team preferences:", preferences);
        setFavoriteTeams(preferences);
        setShowSettings(false);
      } else {
        setShowSettings(true);
        setFavoriteTeams([]);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching team preferences:", error.message);
      } else {
        console.error("Unknown error fetching team preferences:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTeam) return;
    let cancelled = false;

    // Quickly update fan count using getFanCountForTeam
    getFanCountForTeam(selectedTeam.toLowerCase())
      .then(count => {
        if (!cancelled) {
          setFanCount(count);
        }
      })
      .catch(err => console.error('Error fetching fan count:', err));

    // If we have cached followers for this team, use them and avoid refetching
    if (cachedTeamFollowers[selectedTeam]) {
      setFavoriteTeamFans(cachedTeamFollowers[selectedTeam]);
      setLoadingFollowers(false);
      return;
    }
    
    // Clear out previous fans and show loading state
    setFavoriteTeamFans([]);
    setShowMatchUps(false);
    setMatchUps([]);
    setLoadingFollowers(true);

    const fetchFans = async () => {
      try {
        const fanFids = await getFansForTeam(selectedTeam.toLowerCase());
        const context = await sdk.context;
        console.log('context now', context.user);
        const currentFid = context.user?.fid;
        if (!currentFid) {
          console.error("No current fid found");
          return;
        }
        
        // Convert the fan FIDs to numbers
        const numericFids = fanFids.map(Number);
        
        // Team fans are already known from Redis; only resolve whether you follow them.
        const followingMap = await fetchFollowingStatuses(currentFid, numericFids);
        
        const userDatas = await Promise.all(numericFids.map(fid => fetchFanUserData(fid)));
        const fans = numericFids.reduce<Array<{ fid: number; pfp: string; youFollow: boolean; username?: string }>>((acc, fid, index) => {
          const userData = userDatas[index];
          const pfp = userData?.USER_DATA_TYPE_PFP?.[0];
          const uname = (userData?.USER_DATA_TYPE_USERNAME?.[0] || '').toLowerCase();
          if (pfp) {
            const youFollow = Boolean(followingMap[fid]);
            acc.push({ fid, pfp, youFollow, username: uname || undefined });
          }
          return acc;
        }, []);
        
        if (!cancelled) {
          // Cache the fetched fans for this team
          setCachedTeamFollowers(prev => ({ ...prev, [selectedTeam]: fans }));
          setFavoriteTeamFans(fans);
        }
      } catch (err) {
        console.error("Error fetching fans:", err);
      } finally {
        if (!cancelled) {
          setLoadingFollowers(false);
        }
      }
    };
    
    fetchFans();
    
    return () => {
      cancelled = true;
    };
  }, [selectedTeam, cachedTeamFollowers]);

  // Fetch the user's favorite teams from Redis
  useEffect(() => {
    fetchFavoriteTeams();
  }, []);

  useEffect(() => {
    if (favoriteTeams.length === 0) return;

    const leagueMap: Record<string, string[]> = {};

    favoriteTeams.forEach((teamId) => {
      const [league, abbr] = teamId.split("-");
      if (!leagueMap[league]) {
        leagueMap[league] = [];
      }
      leagueMap[league].push(abbr);
    });

    Object.entries(leagueMap).forEach(([league, abbrs]) => {
      fetchTeamLinksByLeague(league, abbrs);
    });
  }, [favoriteTeams, selectedTeam]);

  useEffect(() => {
    if (!selectedTeam && favoriteTeams.length > 0) {
      setSelectedTeam(favoriteTeams[0]);
    }
  }, [favoriteTeams, selectedTeam]);

  const getTeamLogoUrl = (teamId: string): string => {
    const [league, abbr] = teamId.split("-");
    return getTeamLogo(abbr, league);
  };

  const fetchTeamLinksByLeague = async (league: string, teamAbbrs: string[]) => {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams`);
      const data = await res.json();
      const teams = data?.sports?.[0]?.leagues?.[0]?.teams || [];

      const newLinks: Record<string, TeamLink[]> = {};
      teamAbbrs.forEach((abbr) => {
        const matched = teams.find(
          (t: { team: { abbreviation: string } }) => t.team.abbreviation.toLowerCase() === abbr.toLowerCase()
        );
        if (matched?.team?.links) {
          newLinks[abbr] = matched.team.links;
        }
      });

      setTeamLinks((prev) => ({
        ...prev,
        ...newLinks
      }));
    } catch (err) {
      console.error(`Failed to fetch team links for league ${league}`, err);
    }
  };

  if (loading) return <div>For you today</div>;
  if (error) return <div>{error}</div>;
  console.log("teamLinks", teamLinks);
  if (showSettings) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-notWhite text-xl sm:text-2xl font-bold">Follow at least one team</h2>
        </div>
        <div className="mb-4">
          <ul className="list-disc list-inside space-y-2 text-base text-lightPurple">
            <li>🔔 Goal and score alerts for the teams you follow</li>
            <li>🤝 See who else follows your club or country</li>
            <li>⭐ Set one favorite to anchor your Footy identity</li>
          </ul>
        </div>
        <SettingsFollowClubs onSave={(newFavorites: string[]) => {
          setFavoriteTeams(newFavorites);
          setSelectedTeam(newFavorites[0] ?? null);
          setShowSettings(false);
        }} />
      </div>
    );
  }
  return (
    <div className="bg-purplePanel text-lightPurple rounded-lg p-1 overflow-hidden">
      <h2 className='text-notWhite'>Teams you follow</h2>
      <div className="flex overflow-x-auto gap-4 py-2">
        {favoriteTeams.map((teamId) => {
          return (
            <div
              key={teamId}
              onClick={() => setSelectedTeam(teamId)}
              className={`relative flex-none w-[120px] border ${
                teamId === selectedTeam
                  ? "border-limeGreenOpacity shadow-[0_0_10px_2px_rgba(173,255,47,0.5)]"
                  : "border-lightPurple"
              } rounded-lg p-2 text-center bg-purplePanel cursor-pointer`}
            >
              <Image
                src={getTeamLogoUrl(teamId)}
                alt={teamId}
                width={60}
                height={60}
                className="object-contain mb-2 mx-auto"
              />
            </div>
          );
        })}
        <div
          onClick={() => setShowSettings(true)}
          className="flex-none w-[120px] border border-dashed border-limeGreenOpacity rounded-lg p-2 text-center bg-purplePanel cursor-pointer flex flex-col items-center justify-center"
        >
          <div className="text-2xl text-limeGreen">+</div>
          <div className="text-sm text-lightPurple mt-1">Manage</div>
        </div>
      </div>
        {selectedTeam && favoriteTeams.includes(selectedTeam) && (() => {
        return (
          <div className="relative rounded-lg overflow-hidden">
            <div className="mt-2">
              <h3 className="text-notWhite mb-1 m">Club Fans ({fanCount})</h3>
              <div className="flex items-center gap-4 text-xs text-lightPurple mb-2 ml-1">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 ring-2 ring-limeGreen rounded-full inline-block"></span>
                  <span>You follow</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 ring-2 ring-fontRed rounded-full inline-block"></span>
                  <span>You don’t follow</span>
                </div>
              </div>
              {loadingFollowers ? (
                <div className="text-sm text-gray-400 animate-pulse">Loading followers...</div>
              ) : (
                <div className="grid grid-cols-10 gap-1 ml-1 mr-1">
                  {favoriteTeamFans.length > 0 ? (
                    favoriteTeamFans.map((fan) => (
                      <button
                        key={fan.fid}
                        onClick={async () => {
                          try { await sdk.haptics.impactOccurred('light'); } catch {}
                          sdk.actions.viewProfile({ fid: fan.fid });
                        }}
                        className={`rounded-full border-2 focus:outline-none w-6 h-6 flex items-center justify-center ${
                          fan.youFollow ? 'border-limeGreen' : 'border-fontRed'
                        }`}
                      >
                        <Image
                          src={fan.pfp}
                          alt={`Fan ${fan.fid}`}
                          width={20}
                          height={20}
                          className="rounded-full aspect-square object-cover w-5 h-5"
                        />
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No fans found.</span>
                  )}
                </div>
              )}
            </div>
        {showMatchUps && (
          <div className="mt-4">
            <h2 className="text-notWhite text-md font-semibold mb-2">Fans Most Like You</h2>
            <ul className="space-y-2">
              {matchUps.slice(0, 8).map((pair, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => sdk.actions.viewProfile({ fid: pair.fid2 })}
                    className="focus:outline-none"
                  >
                    <Image
                      src={pair.pfp ?? '/defifa_spinner.gif'}
                      alt={`Fan ${pair.fid2}`}
                      width={32}
                      height={32}
                      className="rounded-full border"
                    />
                  </button>
                  <div>
                    <div className="flex gap-1">
                        {pair.teamLogos?.map((logo, idx) => (
                          typeof logo === 'string' ? (
                            <Image key={idx} src={logo} alt="Team" width={20} height={20} className="rounded-md" />
                          ) : null
                        ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
        );
      })()}
    </div>
  );
};

export default ForYouTeamsFans;
