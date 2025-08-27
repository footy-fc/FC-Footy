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
  const { events, loading: eventsLoading, error } = useEventsData(league);

  // When a league button is clicked, update the league via the parent
  const handleLeagueClick = (leagueId: string) => {
    console.log("Selected league:", leagueId);
    setSelectedLeague(leagueId);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="ml-1 font-xl text-notWhite font-bold mb-4">
          Leagues & Cups
        </h2>
        <button
          onClick={() => setSelectedTab("settings")}
          className="mb-3 flex items-center text-sm text-fontRed hover:underline focus:outline-none"
        >
          <span>Follow teams 🔔</span>
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
      <div className="p-4 mt-2 bg-purplePanel text-lightPurple rounded-lg">
        {eventsLoading ? (
          <div>Loading match context...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : events && events.length > 0 ? (
          events.map((event: any) => (
            <EventCard key={event.id} event={event} sportId={league} />
          ))
        ) : (
          <div>No events available for {league}</div>
        )}
      </div>
    </div>
  );
};

export default MatchesTab;