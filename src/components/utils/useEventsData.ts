/* eslint-disable */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import sportsData from './sportsData';  // Import the sportsData array
import { fetchScoreboardEvents, type EventDateWindow } from '~/lib/scoreboard';

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

const LIVE_SCOREBOARD_REFRESH_MS = 20000;
const DUE_PREMATCH_REFRESH_MS = 60000;

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
  const requestRef = useRef<AbortController | null>(null);

  const fetchEventsData = useCallback(async (showLoading = false) => {
    if (requestRef.current) {
      return;
    }

    if (!selectedSport) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    if (showLoading) {
      setLoading(true);
    }
    if (showLoading) setError(null);
    // console.log("Fetching events data for selected sport:", selectedSport);
    
    try {
      const sport = sportsData.find(s => s.sportId === selectedSport);
      if (!sport) {
        throw new Error("Invalid sport selected");
      }
  
      const nextEvents = await fetchScoreboardEvents<Event>(sport.url, dateWindow, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setEvents(nextEvents);
        setError(null);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (showLoading) {
        setError('Failed to load events data');
      }
      console.error(error);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (showLoading && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [dateWindow?.futureDays, dateWindow?.pastDays, selectedSport]);

  useEffect(() => {
    setEvents([]);
    void fetchEventsData(true);
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'hidden') void fetchEventsData(false);
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    window.addEventListener('focus', refreshOnReturn);
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.removeEventListener('focus', refreshOnReturn);
    };
  }, [fetchEventsData]);

  const liveEventCount = useMemo(() => events.filter(isEventLive).length, [events]);

  useEffect(() => {
    if (!selectedSport) {
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

    // Keep retrying after a failed refresh or a timer firing while hidden.
    // Cap the delay so a date window also rolls forward on long-lived tabs.
    const delay = Math.min(
      getNextUnstartedEventDelay(events) ?? DUE_PREMATCH_REFRESH_MS,
      DUE_PREMATCH_REFRESH_MS,
    );
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void fetchEventsData(false);
    }, delay);
    return () => window.clearInterval(interval);
  }, [events, fetchEventsData, liveEventCount, selectedSport]);

  return { events, loading, error, liveEventCount };
}

export default useEventsData;
