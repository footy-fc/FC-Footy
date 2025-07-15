/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { GameData } from '../types/gameTypes';
import { apolloClient } from '../lib/apollo-client';
import { GET_GAME_BY_EVENT_ID } from '../lib/graphql/queries';
import useEventsData from '../components/utils/useEventsData';
import useFindClosestMatch from '../components/utils/useFindClosestMatch';

interface GameContextType {
  gameDataState: GameData | null;
  homeScore: string | number;
  awayScore: string | number;
  gameClock: string;
  gameStatus: string;
  setGameDataState: (data: GameData | null) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  error: string | null;
  setError: (value: string | null) => void;
  winnerProfiles: Record<string, { username: string; pfp: string }>;
  // New enhanced features
  matchEvents: any[];
  lastEvent: any | null;
  isMatchLive: boolean;
  matchStartTime: string | null;
  timeUntilMatch: string | null;
  ticketPurchaseHistory: Array<{ buyer: string; squareIndex: number; timestamp: number }>;
  recentActivity: Array<{ type: 'purchase' | 'goal' | 'card' | 'match_start' | 'match_end'; message: string; timestamp: number }>;
  notifications: Array<{ id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: number }>;
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  clearNotification: (id: string) => void;
  refreshGameData: () => Promise<void>;
  isRefreshing: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};

interface Match {
  id: string;
  date: string;
  venue: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeLogo: string;
  awayLogo: string;
  matchClock: string;
  matchStatus: string;
  matchCompleted: boolean;
  matchEvents: any[];
  matchSummary: string;
  tvBroadcasts?: {
    network: string;
    region: string;
    language: string;
  }[];
  bettingOdds?: {
    provider: string;
    homeOdds: number;
    awayOdds: number;
    drawOdds: number;
  }[];
}

export const GameProvider: React.FC<{ children: ReactNode; eventId: string }> = ({ children, eventId }) => {
  const [gameDataState, setGameDataState] = useState<GameData | null>(null);
  const [homeScore, setHomeScore] = useState<string | number>('-');
  const [awayScore, setAwayScore] = useState<string | number>('-');
  const [gameClock, setGameClock] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [winnerProfiles, setWinnerProfiles] = useState<Record<string, { username: string; pfp: string }>>({});
  
  // New enhanced state
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [lastEvent, setLastEvent] = useState<any | null>(null);
  const [isMatchLive, setIsMatchLive] = useState<boolean>(false);
  const [matchStartTime, setMatchStartTime] = useState<string | null>(null);
  const [timeUntilMatch, setTimeUntilMatch] = useState<string | null>(null);
  const [ticketPurchaseHistory, setTicketPurchaseHistory] = useState<Array<{ buyer: string; squareIndex: number; timestamp: number }>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ type: 'purchase' | 'goal' | 'card' | 'match_start' | 'match_end'; message: string; timestamp: number }>>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: number }>>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Extract `leagueId` from `eventId`
  const extractLeagueId = (eventId: string): string => {
    const parts = eventId.split("_");
    return parts.length > 1 ? `${parts[0]}.${parts[1]}` : "default.league";
  };

  const leagueId = extractLeagueId(eventId);
  const { events, loading: eventsLoading, error: eventsError } = useEventsData(leagueId);

  // Format Matches
  const formattedMatches = events.map(event => ({
    id: event.id,
    date: event.date,
    venue: event.venue?.displayName || "Unknown Venue",
    homeTeam: event.competitions?.[0]?.competitors?.[0]?.team?.abbreviation || "UNK",
    awayTeam: event.competitions?.[0]?.competitors?.[1]?.team?.abbreviation || "UNK",
    homeScore: Number(event.competitions?.[0]?.competitors?.[0]?.score ?? 0),
    awayScore: Number(event.competitions?.[0]?.competitors?.[1]?.score ?? 0),
    homeLogo: event.competitions?.[0]?.competitors?.[0]?.team?.logo || "",
    awayLogo: event.competitions?.[0]?.competitors?.[1]?.team?.logo || "",
    matchClock: event.competitions?.[0]?.status?.displayClock || "",
    matchStatus: event.competitions?.[0]?.status?.type?.detail || "Unknown",
    matchCompleted: event.competitions?.[0]?.status?.type?.completed ?? false,
    matchEvents: (event.competitions?.[0]?.details || []).map((detail: any) => ({
      type: {
        id: detail.type?.id ?? 'unknown',
        text: detail.type?.text ?? '',
      },
      clock: {
        value: detail.clock?.value ?? 0,
        displayValue: detail.clock?.displayValue ?? '',
      },
      team: {
        id: detail.team?.id ?? '',
      },
      scoreValue: detail.scoreValue ?? 0,
      scoringPlay: detail.scoringPlay ?? false,
      redCard: detail.redCard ?? false,
      yellowCard: detail.yellowCard ?? false,
      penaltyKick: detail.penaltyKick ?? false,
      ownGoal: detail.ownGoal ?? false,
      shootout: detail.shootout ?? false,
      athletesInvolved: detail.athletesInvolved ?? [],
    })),
    matchSummary: event.competitions?.[0]?.headlines?.[0]?.description || "",
    tvBroadcasts: event.competitions?.[0]?.geoBroadcasts || [],
    bettingOdds: event.competitions?.[0]?.odds || [],
  }));

  // Find the Closest Match
  const closestMatch = useFindClosestMatch(eventId, formattedMatches);

  // Enhanced notification system
  const addNotification = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const id = Date.now().toString();
    const notification = { id, type, message, timestamp: Date.now() };
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10 notifications
    
    // Auto-remove notifications after 5 seconds
    setTimeout(() => {
      clearNotification(id);
    }, 5000);
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Enhanced game data fetching with better error handling and real-time updates
  const fetchGameData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const { data } = await apolloClient.query({
        query: GET_GAME_BY_EVENT_ID,
        variables: { eventId },
        fetchPolicy: 'network-only',
      });

      if (!data?.games || data.games.length === 0) {
        console.warn("⚠️ No game data found in subgraph.");
        setError("No game data found.");
        setGameDataState(null);
        return;
      }

      const newGameData = data.games[0];
      const oldGameData = gameDataState;

      // Check for new ticket purchases
      if (oldGameData && newGameData.ticketsSold > oldGameData.ticketsSold) {
        const newTickets = newGameData.ticketsSold - oldGameData.ticketsSold;
        addNotification('success', `🎉 ${newTickets} new ticket${newTickets > 1 ? 's' : ''} purchased!`);
        
        // Add to recent activity
        setRecentActivity(prev => [{
          type: 'purchase',
          message: `${newTickets} ticket${newTickets > 1 ? 's' : ''} sold`,
          timestamp: Date.now()
        }, ...prev.slice(0, 19)]); // Keep last 20 activities
      }

      // Check if game just sold out
      if (oldGameData && oldGameData.ticketsSold < 25 && newGameData.ticketsSold === 25) {
        addNotification('success', '🎯 Game sold out! Waiting for referee to finalize...');
        setRecentActivity(prev => [{
          type: 'purchase',
          message: 'Game sold out! 🎯',
          timestamp: Date.now()
        }, ...prev.slice(0, 19)]);
      }

      setGameDataState(newGameData);

      // Stop polling if match is completed
      if (newGameData.prizeClaimed) {
        addNotification('info', '🏆 Game completed! Prizes distributed.');
        return;
      }

    } catch (err) {
      console.error("❌ Error fetching game data:", err);
      setError("Error loading game data.");
      addNotification('error', 'Failed to refresh game data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [eventId, gameDataState, addNotification]);

  // Manual refresh function
  const refreshGameData = useCallback(async () => {
    await fetchGameData();
  }, [fetchGameData]);

  // Enhanced polling with adaptive intervals
  useEffect(() => {
    if (!eventId) return;
  
    setLoading(true);
    setError(null);
    fetchGameData();
  
    // Adaptive polling based on game state
    let intervalId: NodeJS.Timeout | null = null;
    
    if (gameDataState?.prizeClaimed) {
      // No polling for completed games
      intervalId = null;
    } else if (gameDataState?.ticketsSold === 25) {
      // Faster polling when waiting for referee
      intervalId = setInterval(fetchGameData, 10000);
    } else if (isMatchLive) {
      // Fastest polling during live matches
      intervalId = setInterval(fetchGameData, 5000);
    } else {
      // Normal polling
      intervalId = setInterval(fetchGameData, 30000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [eventId, gameDataState?.prizeClaimed, gameDataState?.ticketsSold, isMatchLive, fetchGameData]);
  
  // Enhanced match status updates with live events
  useEffect(() => {
    if (!closestMatch) return;

    const oldHomeScore = homeScore;
    const oldAwayScore = awayScore;
    const oldStatus = gameStatus;

    setHomeScore(prev => (prev === closestMatch.homeScore ? prev : closestMatch.homeScore));
    setAwayScore(prev => (prev === closestMatch.awayScore ? prev : closestMatch.awayScore));
    setGameClock(prev => (prev === closestMatch.matchClock ? prev : closestMatch.matchClock));
    setGameStatus(prev => (prev === closestMatch.matchStatus ? prev : closestMatch.matchStatus));

    // Update match events
    setMatchEvents(closestMatch.matchEvents || []);
    
    // Check for new events
    if (closestMatch.matchEvents && closestMatch.matchEvents.length > matchEvents.length) {
      const newEvents = closestMatch.matchEvents.slice(matchEvents.length);
      setLastEvent(newEvents[newEvents.length - 1]);
      
      // Process new events
      newEvents.forEach(event => {
        if (event.scoringPlay) {
          addNotification('success', `⚽ GOAL! ${event.team?.id || 'Unknown team'}`);
          setRecentActivity(prev => [{
            type: 'goal',
            message: `⚽ Goal scored!`,
            timestamp: Date.now()
          }, ...prev.slice(0, 19)]);
        } else if (event.redCard) {
          addNotification('warning', `🟥 Red card!`);
          setRecentActivity(prev => [{
            type: 'card',
            message: `🟥 Red card shown`,
            timestamp: Date.now()
          }, ...prev.slice(0, 19)]);
        } else if (event.yellowCard) {
          setRecentActivity(prev => [{
            type: 'card',
            message: `🟨 Yellow card shown`,
            timestamp: Date.now()
          }, ...prev.slice(0, 19)]);
        }
      });
    }

    // Check for score changes
    if (oldHomeScore !== closestMatch.homeScore || oldAwayScore !== closestMatch.awayScore) {
      addNotification('info', `📊 Score update: ${closestMatch.homeScore}-${closestMatch.awayScore}`);
    }

    // Check for match status changes
    if (oldStatus !== closestMatch.matchStatus) {
      if (closestMatch.matchStatus === 'In Progress') {
        setIsMatchLive(true);
        addNotification('success', '🚀 Match started!');
        setRecentActivity(prev => [{
          type: 'match_start',
          message: '🚀 Match started!',
          timestamp: Date.now()
        }, ...prev.slice(0, 19)]);
      } else if (closestMatch.matchStatus === 'Full Time') {
        setIsMatchLive(false);
        addNotification('info', '🏁 Match ended');
        setRecentActivity(prev => [{
          type: 'match_end',
          message: '🏁 Match ended',
          timestamp: Date.now()
        }, ...prev.slice(0, 19)]);
      }
    }

    if (closestMatch.matchCompleted) {
      console.log("⚠️ Match is at Full-Time. Stopping updates.");
      setIsMatchLive(false);
    }
  }, [closestMatch, homeScore, awayScore, gameStatus, matchEvents, addNotification]);

  // Calculate time until match
  useEffect(() => {
    if (closestMatch?.date) {
      const matchTime = new Date(closestMatch.date);
      const now = new Date();
      const timeDiff = matchTime.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeUntilMatch(`${hours}h ${minutes}m`);
        setMatchStartTime(closestMatch.date);
      } else {
        setTimeUntilMatch(null);
        setMatchStartTime(null);
      }
    }
  }, [closestMatch]);

  // Listen for manual refresh event
  useEffect(() => {
    const refreshHandler = () => {
      fetchGameData();
    };

    window.addEventListener("refreshGameData", refreshHandler);
    return () => window.removeEventListener("refreshGameData", refreshHandler);
  }, [fetchGameData]);

  return (
    <GameContext.Provider
      value={{
        gameDataState,
        homeScore,
        awayScore,
        gameClock,
        gameStatus,
        setGameDataState,
        loading,
        setLoading,
        error,
        setError,
        winnerProfiles,
        // New enhanced features
        matchEvents,
        lastEvent,
        isMatchLive,
        matchStartTime,
        timeUntilMatch,
        ticketPurchaseHistory,
        recentActivity,
        notifications,
        addNotification,
        clearNotification,
        refreshGameData,
        isRefreshing,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
