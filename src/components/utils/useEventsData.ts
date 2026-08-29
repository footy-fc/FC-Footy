/* eslint-disable */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import sportsData from './sportsData';  // Import the sportsData array

interface Event {
  links: any;
  venue: any;
  id: string;
  shortName: string;
  name: string;
  date: string;
  status: {
    displayClock: string;
    type: {
      detail: string;
      state?: string;
      completed?: boolean;
    };
  };
  competitions: {
    odds: any;
    geoBroadcasts: any;
    headlines: any;
    status: {
      displayClock?: string;
      type?: {
        detail?: string;
        state?: string;
        completed?: boolean;
      };
    };
    competitors: {
      team: {
        abbreviation: string;
        logo: string;
        id: string;
      };
      score: number;
    }[];
    details: Detail[];
  }[];
}

interface Detail {
  athletesInvolved: Array<{ displayName: string }>;
  type: {
    text: string;
  };
  clock: {
    displayValue: string;
  };
  team: {
    id: string;
  };
}

interface EventDateWindow {
  pastDays: number;
  futureDays: number;
}

const LIVE_SCOREBOARD_REFRESH_MS = 20000;
const DUE_PREMATCH_REFRESH_MS = 60000;

function formatEspnDate(date: Date) {
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0'),
  ].join('');
}

function getScoreboardUrl(baseUrl: string, dateWindow?: EventDateWindow) {
  if (!dateWindow) {
    return baseUrl;
  }

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setUTCDate(start.getUTCDate() - dateWindow.pastDays);
  end.setUTCDate(end.getUTCDate() + dateWindow.futureDays);

  const url = new URL(baseUrl);
  url.searchParams.set('dates', `${formatEspnDate(start)}-${formatEspnDate(end)}`);
  return url.toString();
}

function getEventStatusState(event: Event) {
  return event.competitions?.[0]?.status?.type?.state || event.status?.type?.state || null;
}

function isEventCompleted(event: Event) {
  return Boolean(event.competitions?.[0]?.status?.type?.completed || event.status?.type?.completed);
}

function isEventLive(event: Event) {
  return getEventStatusState(event) === 'in';
}

function getNextUnstartedEventDelay(events: Event[]) {
  const now = Date.now();
  const upcomingDelays = events
    .filter((event) => !isEventLive(event) && !isEventCompleted(event))
    .map((event) => new Date(event.date).getTime() - now)
    .filter((delay) => Number.isFinite(delay))
    .sort((left, right) => left - right);

  if (upcomingDelays.length === 0) {
    return null;
  }

  const nextDelay = upcomingDelays[0];
  if (nextDelay <= 0) {
    return DUE_PREMATCH_REFRESH_MS;
  }

  return nextDelay + 5000;
}

function useEventsData(selectedSport: string, dateWindow?: EventDateWindow) {
  const [events, setEvents] = useState<Event[]>([]); // Use the Event type
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchEventsData = useCallback(async (showLoading = false) => {
    if (isFetchingRef.current) {
      return;
    }

    if (!selectedSport) {
      setEvents([]);
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    // console.log("Fetching events data for selected sport:", selectedSport);
    
    try {
      const sport = sportsData.find(s => s.sportId === selectedSport);
      if (!sport) {
        throw new Error("Invalid sport selected");
      }
  
      const response = await fetch(getScoreboardUrl(sport.url, dateWindow), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${sport.name}`);
      }
  
      // ✅ FIX: Call response.json() only once and store it in a variable
      const data = await response.json();
      // console.log("✅ Response received:", data); // Log the parsed data, not response.json()
      
      setEvents(data.events || []);
    } catch (error) {
      if (showLoading) {
        setError('Failed to load events data');
      }
      console.error(error);
    } finally {
      isFetchingRef.current = false;
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [dateWindow?.futureDays, dateWindow?.pastDays, selectedSport]);

  useEffect(() => {
    if (selectedSport) {
      fetchEventsData(true);
    }
  }, [selectedSport, fetchEventsData]);  // Dependency array includes selectedSport

  const liveEventCount = useMemo(() => events.filter(isEventLive).length, [events]);

  useEffect(() => {
    if (!selectedSport || events.length === 0) {
      return;
    }

    if (liveEventCount > 0) {
      const interval = window.setInterval(() => {
        if (document.visibilityState === 'hidden') {
          return;
        }

        fetchEventsData(false);
      }, LIVE_SCOREBOARD_REFRESH_MS);
      return () => window.clearInterval(interval);
    }

    const nextUnstartedEventDelay = getNextUnstartedEventDelay(events);
    if (nextUnstartedEventDelay == null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      fetchEventsData(false);
    }, nextUnstartedEventDelay);
    return () => window.clearTimeout(timeout);
  }, [events, fetchEventsData, liveEventCount, selectedSport]);

  return { events, loading, error, liveEventCount };
}

export default useEventsData;
