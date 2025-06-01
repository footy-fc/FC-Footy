import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { getTeamPreferences, getFanCountForTeam } from "../lib/kvPerferences";
import { usePrivy } from "@privy-io/react-auth";
import { getTeamLogo } from "./utils/fetchTeamLogos";
import { getFansForTeam } from '../lib/kvPerferences'; // Assuming these functions are imported from a relevant file
import { fetchMutualFollowers } from './utils/fetchCheckIfFollowing';
import SettingsFollowClubs from './SettingsFollowClubs';
import ContentLiveChat from './ContentLiveChat';
import { getAlikeFanMatches } from "./utils/getAlikeFanMatches";
import type { FanPair } from "./utils/getAlikeFanMatches";
import { fetchFanUserData } from './utils/fetchFCProfile';

type TeamLink = {
  href: string;
  text?: string;
  shortText?: string;
};

const ForYouTeamsFans: React.FC<{ showLiveChat: boolean; setShowLiveChat: (val: boolean) => void }> = ({ showLiveChat, setShowLiveChat }) => {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLinks, setTeamLinks] = useState<Record<string, TeamLink[]>>({});
  const { user } = usePrivy();
  const currentFid = user?.linkedAccounts.find((a) => a.type === "farcaster")?.fid;
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [favoriteTeamFans, setFavoriteTeamFans] = useState<Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>([]);
  const [fanCount, setFanCount] = useState<number>(0);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cachedTeamFollowers, setCachedTeamFollowers] = useState<Record<string, Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>>({});
  const [showMatchUps, setShowMatchUps] = useState(false);
  const [matchUps, setMatchUps] = useState<FanPair[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const showChatFeature = false;

  const fetchFavoriteTeams = async () => {
    try {
      const farcasterAccount = user?.linkedAccounts.find(
        (account) => account.type === "farcaster"
      );
      const fid = farcasterAccount?.fid;

      if (!fid) {
        setError("No Farcaster FID found in Privy account");
        return;
      }

      const preferences = await getTeamPreferences(fid);
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
    setLoadingMatches(false);
    setLoadingFollowers(true);

    const fetchFans = async () => {
      try {
        const fanFids = await getFansForTeam(selectedTeam.toLowerCase());
        const currentFid = user?.linkedAccounts.find((a) => a.type === "farcaster")?.fid;
        if (!currentFid) {
          console.error("No current fid found");
          return;
        }
        
        // Convert the fan FIDs to numbers
        const numericFids = fanFids.map(Number);
        
        // Batch fetch mutual follower data using Neynar's bulk endpoint
        const mutualMap = await fetchMutualFollowers(currentFid, numericFids);
        
        const userDatas = await Promise.all(numericFids.map(fid => fetchFanUserData(fid)));
        const fans = numericFids.reduce<Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>((acc, fid, index) => {
          const userData = userDatas[index];
          const pfp = userData?.USER_DATA_TYPE_PFP?.[0];
          if (pfp) {
            const mutual = mutualMap[fid];
            const youFollow = fid === currentFid; // Determine if the current user follows this fan
            acc.push({ fid, pfp, mutual, youFollow });
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
  }, [selectedTeam, user, cachedTeamFollowers]);

  // Fetch the user's favorite teams from Redis
  useEffect(() => {
    fetchFavoriteTeams();
  }, [user]);

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
  }, [favoriteTeams]);

  useEffect(() => {
    if (!selectedTeam && favoriteTeams.length > 0) {
      setSelectedTeam(favoriteTeams[0]);
    }
  }, [favoriteTeams]);

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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-notWhite">Follow at least one team</h2>
        </div>
        <SettingsFollowClubs onSave={(newFavorites: string[]) => {
          setFavoriteTeams(newFavorites);
          setSelectedTeam(newFavorites[0] ?? null);
          setShowSettings(false);
        }} />
      </div>
    );
  }
  if (showLiveChat && selectedTeam) {
    return (      
      <div className="h-[380px] overflow-hidden rounded-lg relative">
        <ContentLiveChat teamId={selectedTeam} />
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
              <img
                src={getTeamLogoUrl(teamId)}
                alt={teamId}
                className="w-[60px] h-[60px] object-contain mb-2 mx-auto"
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
              <h3 className="text-notWhite mb-1 m">Team Followers ({fanCount})</h3>
              <div className="flex items-center gap-4 text-xs text-lightPurple mb-2 ml-1">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 ring-2 ring-limeGreen rounded-full inline-block"></span>
                  <span>You follow</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 ring-2 ring-fontRed rounded-full inline-block"></span>
                  <span>You don’t follow</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 ring-2 ring-purple-500 rounded-full inline-block"></span>
                  <span>Mutual</span>
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
                        onClick={() => sdk.actions.viewProfile({ fid: fan.fid })}
                        className="focus:outline-none"
                      >
                        <img
                          src={fan.pfp}
                          alt={`Fan ${fan.fid}`}
                          className={`rounded-full w-7 h-7 ${
                            fan.fid === currentFid ? '' :
                            fan.mutual ? 'ring-2 ring-purple-500' :
                            fan.youFollow ? 'ring-2 ring-limeGreen' :
                            'ring-2 ring-fontRed'
                          }`}
                        />
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No fans found.</span>
                  )}
                </div>
              )}
            </div>
                    {/* New affordance added below the team followers */}
        <div className="mt-4 text-center">
          <p className="text-lightPurple text-sm">
            Connect with fellow fans and share your passion for the beautiful game!
          </p>
          <div className="mt-2 flex gap-2 justify-center">
            {showChatFeature && (
              <button
                onClick={() => {
                  setShowLiveChat(true);
                }}
                className="px-4 py-2 bg-deepPink hover:bg-fontRed text-white rounded-lg"
              >
                Join the chat
              </button>
            )}
            <button
              disabled={loadingMatches}
              onClick={async () => {
                setLoadingMatches(true);
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
              {loadingMatches ? 'Loading...' : 'Fans like you'}
            </button>
          </div>
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
                    <img
                      src={pair.pfp}
                      alt={`Fan ${pair.fid2}`}
                      className="w-8 h-8 rounded-full border"
                    />
                  </button>
                  <div>
                    <div className="flex gap-1">
                      {pair.teamLogos?.map((logo, idx) => (
                        <img key={idx} src={logo} alt="Team" className="w-5 h-5 rounded-md" />
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