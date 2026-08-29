/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import EventCard from "./MatchEventCard";
import LeaguesDropdown from "./LeaguesDropdown";
import useEventsData from "./utils/useEventsData";
import useSortedSportsData from "./utils/useSortedSportsData";

interface MatchesTabProps {
  setSelectedTab: (tab: string) => void;
  league: string;
  setSelectedLeague: (league: string) => void;
}

const MatchesTab: React.FC<MatchesTabProps> = ({ setSelectedTab, league, setSelectedLeague }) => {
  // Fetch sorted sports data
  const { sortedSports, loading: sportsLoading } = useSortedSportsData();

  // Fetch events based on the currently selected league
  const { events, loading: eventsLoading, error } = useEventsData(league, {
    pastDays: 7,
    futureDays: 7,
  });

  // State to track which match card is currently expanded
  const [openCardId, setOpenCardId] = React.useState<string | null>(null);

  // When a league button is clicked, update the league via the parent
  const handleLeagueClick = (leagueId: string) => {
    console.log("Selected league:", leagueId);
    setSelectedLeague(leagueId);
  };

  // Handle opening/closing match cards - only one can be open at a time
  const handleCardToggle = (cardId: string) => {
    setOpenCardId(openCardId === cardId ? null : cardId);
  };

  const matchGroups = React.useMemo(() => {
    const eventState = (event: any) =>
      event.competitions?.[0]?.status?.type?.state || event.status?.type?.state;
    const isCompleted = (event: any) =>
      event.competitions?.[0]?.status?.type?.completed ||
      event.status?.type?.completed ||
      eventState(event) === "post";
    const byKickoffAscending = (left: any, right: any) =>
      new Date(left.date).getTime() - new Date(right.date).getTime();

    return {
      live: events
        .filter((event: any) => eventState(event) === "in")
        .sort(byKickoffAscending),
      upcoming: events
        .filter((event: any) => eventState(event) === "pre" && !isCompleted(event))
        .sort(byKickoffAscending),
      previous: events
        .filter((event: any) => isCompleted(event))
        .sort((left: any, right: any) => byKickoffAscending(right, left)),
    };
  }, [events]);

  const renderMatches = (matches: any[]) =>
    matches.map((event: any) => (
      <EventCard
        key={event.id}
        event={event}
        sportId={league}
        isOpen={openCardId === event.id}
        onToggle={() => handleCardToggle(event.id)}
      />
    ));

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <h2 className="ml-1 font-xl text-notWhite font-bold">
          Leagues & Cups
        </h2>
        <button
          onClick={() => setSelectedTab("fanClubs")}
          title="Follow teams to personalize Scores"
          aria-label="Follow teams"
          className="self-end px-3 py-1 text-xs rounded text-lightPurple hover:bg-deepPink hover:text-white transition-colors"
        >
          Follow teams 🔔
        </button>
      </div>
      {/* Leagues & Cups Dropdown */}
      <LeaguesDropdown
        sports={sortedSports}
        selectedLeague={league}
        onLeagueSelect={handleLeagueClick}
        loading={sportsLoading}
      />
      {/* Matches Content */}
      <div className="p-3 mt-2 bg-purplePanel text-lightPurple rounded-[20px]">
        {eventsLoading ? (
          <div className="py-8 text-center text-sm text-lightPurple/70">Loading match context...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">{error}</div>
        ) : events && events.length > 0 ? (
          <div className="space-y-5">
            {matchGroups.live.length > 0 && (
              <section aria-labelledby="live-matches-heading">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 id="live-matches-heading" className="app-section-title flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-deepPink" aria-hidden="true" />
                    Live now
                  </h3>
                  <span className="app-micro">{matchGroups.live.length}</span>
                </div>
                <div className="space-y-2">{renderMatches(matchGroups.live)}</div>
              </section>
            )}

            <section aria-labelledby="upcoming-matches-heading">
              <div className="mb-2 flex items-end justify-between px-1">
                <div>
                  <h3 id="upcoming-matches-heading" className="app-section-title">Up next</h3>
                  <p className="app-micro mt-1">The next 7 days</p>
                </div>
                <span className="app-micro">{matchGroups.upcoming.length}</span>
              </div>
              {matchGroups.upcoming.length > 0 ? (
                <div className="space-y-2">{renderMatches(matchGroups.upcoming)}</div>
              ) : (
                <div className="rounded-xl border border-dashed border-limeGreenOpacity/30 px-3 py-4 text-center text-sm text-lightPurple/70">
                  No fixtures in the next 7 days.
                </div>
              )}
            </section>

            <section aria-labelledby="previous-matches-heading">
              <div className="mb-2 flex items-end justify-between px-1">
                <div>
                  <h3 id="previous-matches-heading" className="app-section-title">Recent results</h3>
                  <p className="app-micro mt-1">The previous 7 days</p>
                </div>
                <span className="app-micro">{matchGroups.previous.length}</span>
              </div>
              {matchGroups.previous.length > 0 ? (
                <div className="space-y-2">{renderMatches(matchGroups.previous)}</div>
              ) : (
                <div className="rounded-xl border border-dashed border-limeGreenOpacity/30 px-3 py-4 text-center text-sm text-lightPurple/70">
                  No results from the previous 7 days.
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-lightPurple/70">No matches available for this league.</div>
        )}
      </div>
    </div>
  );
};

export default MatchesTab;
