import React, { useEffect, useState } from 'react';
import { getTeamPreferences } from "../lib/kvPerferences";
import EventCard from "./MatchEventCard";
import { MatchEvent } from "../types/gameTypes";
import { sdk } from "@farcaster/frame-sdk";

const ForYouWhosPlaying: React.FC = () => {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchEvent[]>([]);

  const fetchFavoriteTeams = async () => {
    try {
      const context = await sdk.context;
      console.log('context now', context.user);
      const fid = context.user?.fid;

      if (!fid) {
        setError("No Farcaster FID found in frame context");
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

    const fetchAllMatches = async () => {
      try {
        const allMatches: MatchEvent[] = [];
        await Promise.all(Object.entries(leagueMap).map(async ([league]) => {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`);
          const data = await res.json();
          const events = data?.events || [];
          // @ts-expect-error waiting to clean up types
          const filtered = events.filter(event => {
            const shortName = event?.shortName || '';
            const home = shortName.slice(6, 9).toLowerCase();
            const away = shortName.slice(0, 3).toLowerCase();
            return leagueMap[league].includes(home) || leagueMap[league].includes(away);
          });
         // @ts-expect-error waiting to clean up types
      const eventsWithLeague = filtered.map(event => ({
        ...event,
        league
      }));
      
      allMatches.push(...eventsWithLeague);
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
          const eventDate = new Date(event.date);
          const now = new Date();
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(now.getDate() - 14);

          if (eventDate < twoDaysAgo) return false;

          const shortName = event?.shortName || '';
          const home = shortName.slice(6, 9).toLowerCase();
          const away = shortName.slice(0, 3).toLowerCase();
          return favoriteTeams.some(fav => fav.includes(home) || fav.includes(away));
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(event => (
          // @ts-expect-error: Ignoring type issues for the event prop for now
          <EventCard key={event.id} event={event} sportId={event.league|| ''} />
      ))}
    </div>
  );
};

export default ForYouWhosPlaying;