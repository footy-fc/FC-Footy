import { useEffect, useState } from "react";
import sportsData from "./sportsData";

interface Sport {
  name: string;
  sportId: string;
  url: string;
}

interface Event {
  id: string;
  date: string;
  status: {
    type: {
      state: "pre" | "in" | "post";
    };
  };
}

const UPCOMING_LOOKAHEAD_DAYS = 45;

function formatEspnDate(date: Date) {
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, "0"),
    `${date.getUTCDate()}`.padStart(2, "0"),
  ].join("");
}

function getUpcomingScoreboardUrl(baseUrl: string) {
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + UPCOMING_LOOKAHEAD_DAYS);

  const url = new URL(baseUrl);
  url.searchParams.set(
    "dates",
    `${formatEspnDate(start)}-${formatEspnDate(end)}`
  );
  return url.toString();
}

function getLocalMatchDay(date: string) {
  const matchDay = new Date(date);
  matchDay.setHours(0, 0, 0, 0);
  return matchDay.getTime();
}

const useSortedSportsData = () => {
  const [sortedSports, setSortedSports] = useState<Sport[]>(sportsData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        setLoading(true);
        const sportsWithStatus = await Promise.all(
          sportsData.map(async (sport) => {
            try {
              const response = await fetch(getUpcomingScoreboardUrl(sport.url), {
                cache: "no-store",
              });
              if (!response.ok) {
                throw new Error(`Scoreboard returned ${response.status}`);
              }

              const data = await response.json();
              const events: Event[] = data.events || [];

              // Check for live matches
              const hasLive = events.some(
                (event) => event.status.type.state === "in"
              );

              // Compare calendar match days, not kickoff times, so competitions
              // playing on the same day fall back to alphabetical order.
              const upcomingEvents = events.filter(
                (event) => event.status.type.state === "pre"
              );
              const nextMatchDay = upcomingEvents.length
                ? Math.min(
                    ...upcomingEvents.map((event) =>
                      getLocalMatchDay(event.date)
                    )
                  )
                : Infinity;

              return {
                sport,
                hasLive,
                nextMatchDay,
              };
            } catch (error) {
              console.error(`Error fetching ${sport.name}:`, error);
              return { sport, hasLive: false, nextMatchDay: Infinity };
            }
          })
        );

        // Sort sports based on status
        const sorted = sportsWithStatus.sort((a, b) => {
          // Priority 1: Live matches
          if (a.hasLive && !b.hasLive) return -1;
          if (!a.hasLive && b.hasLive) return 1;

          // Priority 2: Earliest upcoming match day
          if (a.nextMatchDay !== b.nextMatchDay) {
            return a.nextMatchDay - b.nextMatchDay;
          }

          // Priority 3: Alphabetical by name (fallback)
          return a.sport.name.localeCompare(b.sport.name);
        });

        setSortedSports(sorted.map((item) => item.sport));
      } catch (error) {
        console.error("Error sorting sports:", error);
        setSortedSports(sportsData); // Fallback to original order
      } finally {
        setLoading(false);
      }
    };

    fetchAllEvents();
  }, []);

  return { sortedSports, loading };
};

export default useSortedSportsData;
