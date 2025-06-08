import React, { useEffect, useState } from 'react';
import sdk from '@farcaster/frame-sdk';
import { getTeamPreferences, getFanCountForTeam } from "../lib/kvPerferences";
import { getTeamLogo } from "./utils/fetchTeamLogos";
import { getFansForTeam } from '../lib/kvPerferences'; // Assuming these functions are imported from a relevant file
import { fetchMutualFollowers } from './utils/fetchCheckIfFollowing';
import { fetchFanUserData } from './utils/fetchFCProfile';



type TeamLink = {
  href: string;
  text?: string;
  shortText?: string;
};

const ForYouProfile: React.FC = () => {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLinks, setTeamLinks] = useState<Record<string, TeamLink[]>>({});
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [favoriteTeamFans, setFavoriteTeamFans] = useState<Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>([]);
  const [fanCount, setFanCount] = useState<number>(0);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(false);
  const [cachedTeamFollowers, setCachedTeamFollowers] = useState<Record<string, Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>>({});
  const [contextIs, setContextIs] = useState<any>(null);

  useEffect(() => {
    const initSdkContext = async () => {
      await sdk.isInMiniApp();
      await sdk.actions.ready();
      const context = await sdk.context;
      setContextIs(context);
      console.log(context);
      if (context.location?.type === 'cast_share') {
        console.log('yippie ', context.location?.cast?.author?.fid);
      }
    };
    initSdkContext();
  }, []);

  const fetchFavoriteTeams = async () => {
    try {
      if (!contextIs) return;
      console.log('context now', contextIs.user);
      const currentFid = contextIs.user?.fid;

      if (!currentFid) {
        setError("You need to link your Farcaster account to see your favorite teams.");
        return;
      }

      const preferences = await getTeamPreferences(currentFid);
      if (preferences && preferences.length > 0) {
        setFavoriteTeams(preferences);
      } else {
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

    getFanCountForTeam(selectedTeam.toLowerCase())
      .then(count => {
        if (!cancelled) {
          setFanCount(count);
        }
      })
      .catch(err => console.error('Error fetching fan count:', err));

    if (cachedTeamFollowers[selectedTeam]) {
      setFavoriteTeamFans(cachedTeamFollowers[selectedTeam]);
      setLoadingFollowers(false);
      return;
    }
    
    setFavoriteTeamFans([]);
    setLoadingFollowers(true);

    const fetchFans = async () => {
      try {
        const fanFids = await getFansForTeam(selectedTeam.toLowerCase());
        if (!contextIs) return;
        console.log('context now', contextIs.user);
        let currentFid: number | undefined;
        if (contextIs.location?.type === 'cast_share') {
          currentFid = contextIs.location.cast.author.fid ? Number(contextIs.location.cast.author.fid) : undefined;
          if (!currentFid) {
            console.error("No current fid found");
            return;
          }
        } else {
          currentFid = contextIs.user?.fid ? Number(contextIs.user.fid) : undefined;
          if (!currentFid) {
            console.error("No current fid found");
            return;
          }
        }
        const numericFids = fanFids.map(Number);
        
        const mutualMap = await fetchMutualFollowers(currentFid, numericFids);
        
        const userDatas = await Promise.all(numericFids.map(fid => fetchFanUserData(fid)));
        const fans = numericFids.reduce<Array<{ fid: number; pfp: string; mutual: boolean; youFollow?: boolean }>>((acc, fid, index) => {
          const userData = userDatas[index];
          const pfp = userData?.USER_DATA_TYPE_PFP?.[0];
          if (pfp) {
            const mutual = mutualMap[fid];
            const youFollow = fid === currentFid;
            acc.push({ fid, pfp, mutual, youFollow });
          }
          return acc;
        }, []);
        
        if (!cancelled) {
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
  }, [selectedTeam, cachedTeamFollowers, contextIs]);

  useEffect(() => {
    fetchFavoriteTeams();
  }, [contextIs]);

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

  return (
    <div className="bg-purplePanel text-lightPurple rounded-lg p-1 overflow-hidden">
      {/* Fan profile section */}
      <div className="bg-darkPurple text-lightPurple rounded-lg p-2 mb-2">
        
          <span className="font-bold text-notWhite">Fan ID: </span>
          <span className="text-limeGreenOpacity">{contextIs?.location?.cast?.author?.fid ?? contextIs?.user?.fid}</span>
        
      </div>

      {/* Favorite clubs section remains as is */}
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
          onClick={() => {}}
          className="flex-none w-[120px] border border-dashed border-limeGreenOpacity rounded-lg p-2 text-center bg-purplePanel cursor-pointer flex flex-col items-center justify-center"
        >
          <div className="text-2xl text-limeGreen">+</div>
          <div className="text-sm text-lightPurple mt-1">Manage</div>
        </div>
      </div>

      {/* RSS feed section */}
      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 mt-4">
        <h3 className="text-notWhite mb-1">Proof of Fanatic</h3>
        <iframe
          src="https://kmacb.eth.sucks"
          title="Fan RSS Feed"
          className="w-full h-[500px] rounded-lg border border-limeGreenOpacity"
        />
      </div>
    </div>
  );
};

export default ForYouProfile;