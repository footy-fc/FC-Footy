import React, { useEffect, useState } from 'react';
import { getTeamPreferences } from "../lib/kvPerferences";
import { usePrivy } from "@privy-io/react-auth";
import MatchEventCard from './MatchEventCard';
import { MatchEvent } from "../types/gameTypes";

const ForYouWhosPlaying: React.FC = () => {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchEvent[]>([]);
  const { user } = usePrivy();

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

    const fetchAllMatches = async () => {
      try {
        const allMatches: MatchEvent[] = [];
        await Promise.all(Object.entries(leagueMap).map(async ([league]) => {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`);
          const data = await res.json();
          const events = data?.events || [];
          allMatches.push(...events);
        }));
        setMatchData(allMatches);
      } catch (err) {
        console.error("Error fetching match data", err);
      }
    };
    fetchAllMatches();
  }, [favoriteTeams]);

  if (loading) return <div>For you today</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
      <h2 className='text-notWhite mb-2'>Matches for Teams You Follow</h2>
      {matchData
        .filter(event => {
          const shortName = event?.shortName || '';
          const home = shortName.slice(6, 9).toLowerCase();
          const away = shortName.slice(0, 3).toLowerCase();
          return favoriteTeams.some(fav => fav.includes(home) || fav.includes(away));
        })
        .map(event => (
          // @ts-expect-error: Ignoring type issues for the event prop for now
          <MatchEventCard key={event.id} event={event} sportId={event.competitions?.[0]?.id || ''} />
      ))}
    </div>
  );
};

export default ForYouWhosPlaying;