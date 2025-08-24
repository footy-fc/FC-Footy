import React, { useEffect, useState } from 'react';
import { getTeamPreferences } from "../lib/kvPerferences";
import EventCard from "./MatchEventCard";
import { MatchEvent } from "../types/gameTypes";
import { sdk } from "@farcaster/miniapp-sdk";

type Competitor = { homeAway?: string; team?: { abbreviation?: string } };
type Competition = { competitors?: Competitor[] };
type EventLike = { id?: string; date: string; competitions?: Competition[]; league?: string };

interface Props {
  eventId?: string;
}

const ForYouWhosPlaying: React.FC<Props> = ({ eventId }) => {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<MatchEvent[]>([]);
  const [refreshTick, setRefreshTick] = useState<number>(0);

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
    if (eventId) {
      // If a specific event is provided, skip favorites and fetch only that match
      const parts = eventId.split('_');
      if (parts.length >= 3) {
        // Handle different eventId formats:
        // - eng_1_MNC_TOT (4 parts: eng, 1, MNC, TOT)
        // - eng_league_cup_PNE_WXM (5 parts: eng, league, cup, PNE, WXM)
        // - uefa_champions_LIV_BAY (4 parts: uefa, champions, LIV, BAY)
        let maybeLeague: string;
        if (parts.length >= 5) {
          // Format: eng_league_cup_PNE_WXM -> eng.league_cup
          maybeLeague = `${parts[0]}.${parts[1]}_${parts[2]}`;
        } else if (parts.length >= 4) {
          // Format: eng_1_MNC_TOT -> eng.1 or uefa_champions_LIV_BAY -> uefa.champions
          maybeLeague = `${parts[0]}.${parts[1]}`;
        } else {
          // Fallback
          maybeLeague = parts[0].includes('.') ? parts[0] : 'eng.1';
        }
        const home = parts[parts.length - 2]?.toUpperCase();
        const away = parts[parts.length - 1]?.toUpperCase();
        (async () => {
          try {
            setLoading(true);
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${maybeLeague}/scoreboard`);
            const dataJson: unknown = await res.json();
            const events: unknown[] =
              dataJson && typeof dataJson === 'object' && Array.isArray((dataJson as Record<string, unknown>).events)
                ? ((dataJson as Record<string, unknown>).events as unknown[])
                : [];
            const filtered = events.filter((e: unknown) => {
              const ev = e as EventLike;
              const comps: Competitor[] = ev?.competitions?.[0]?.competitors || [];
              const homeAbbrRaw = comps.find((c: Competitor) => c.homeAway === 'home')?.team?.abbreviation;
              const awayAbbrRaw = comps.find((c: Competitor) => c.homeAway === 'away')?.team?.abbreviation;
              const homeAbbr = (homeAbbrRaw || '').toUpperCase().split(':')[0];
              const awayAbbr = (awayAbbrRaw || '').toUpperCase().split(':')[0];
              return homeAbbr === home && awayAbbr === away;
            });
            // attach league so EventCard gets a sportId hint
            const filteredWithLeague = filtered.map((e: unknown) => ({ ...(e as EventLike), league: maybeLeague }));
            setMatchData(filteredWithLeague as unknown as MatchEvent[]);
          } catch (e) {
            console.error('Failed to fetch match for eventId', e);
            setMatchData([]);
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setLoading(false);
      }
    } else {
      fetchFavoriteTeams();
    }
  }, [refreshTick, eventId]);

  // Re-fetch favorites when window regains focus (user may have changed favorites elsewhere)
  useEffect(() => {
    const onFocus = () => setRefreshTick((t) => t + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) onFocus();
      });
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (eventId) return; // handled by the branch above
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
        await Promise.all(
          Object.entries(leagueMap).map(async ([league]) => {
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`);
            const dataJson: unknown = await res.json();
            const events: unknown[] =
              dataJson && typeof dataJson === 'object' && Array.isArray((dataJson as Record<string, unknown>).events)
                ? ((dataJson as Record<string, unknown>).events as unknown[])
                : [];
            // Prefer robust extraction from competitors over brittle shortName slicing
            const filtered = events.filter((event: unknown) => {
              const ev = event as EventLike;
              const comps: Competitor[] = ev?.competitions?.[0]?.competitors || [];
              const homeAbbr = comps.find((c: Competitor) => c.homeAway === 'home')?.team?.abbreviation?.toLowerCase();
              const awayAbbr = comps.find((c: Competitor) => c.homeAway === 'away')?.team?.abbreviation?.toLowerCase();
              return (homeAbbr && leagueMap[league].includes(homeAbbr)) || (awayAbbr && leagueMap[league].includes(awayAbbr));
            });
            const eventsWithLeague = filtered.map((event: unknown) => ({
              ...(event as EventLike),
              league,
            }));
            allMatches.push(...(eventsWithLeague as unknown as MatchEvent[]));
          })
        );
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
      {/* <h2 className='text-notWhite mb-2'>Matches for Teams You Follow</h2> */}
      {matchData
        .filter((event) => {
          const eventDate = new Date(event.date);
          const now = new Date();
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(now.getDate() - 14);

          if (eventDate < twoDaysAgo) return false;

          // If eventId is provided, show the specific event regardless of favorites
          if (eventId) return true;
          const comps: Competitor[] = (event as unknown as EventLike)?.competitions?.[0]?.competitors || [];
          const homeAbbr = comps.find((c: Competitor) => c.homeAway === 'home')?.team?.abbreviation?.toLowerCase();
          const awayAbbr = comps.find((c: Competitor) => c.homeAway === 'away')?.team?.abbreviation?.toLowerCase();
          const favAbbrs = favoriteTeams.map((t) => t.split('-')[1]?.toLowerCase()).filter(Boolean);
          return (homeAbbr && favAbbrs.includes(homeAbbr)) || (awayAbbr && favAbbrs.includes(awayAbbr));
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