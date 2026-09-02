/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Image from "next/image";
import { Bell, ChevronRight } from "lucide-react";
import { sdk } from "@farcaster/miniapp-sdk";
import EventCard from "./MatchEventCard";
import LeaguesDropdown from "./LeaguesDropdown";
import useEventsData from "./utils/useEventsData";
import useSortedSportsData from "./utils/useSortedSportsData";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { getTeamPreferences } from "~/lib/kvPerferences";
import { TEAM_PREFERENCES_UPDATED_EVENT } from "~/lib/teamPreferenceModel";

interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface MatchesTabProps {
  setSelectedTab: (tab: string) => void;
  league: string;
  setSelectedLeague: (league: string) => void;
  onOpenUpdates: () => void;
  viewerFid?: number;
  initialView?: "all" | "following";
}

const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

const getSafeMiniAppContext = async () => {
  try {
    await sdk.actions.ready();
    return (await sdk.context) ?? null;
  } catch {
    return null;
  }
};

const MatchesTab: React.FC<MatchesTabProps> = ({ league, setSelectedLeague, onOpenUpdates, viewerFid, initialView = "all" }) => {
  // Fetch sorted sports data
  const { sortedSports, loading: sportsLoading } = useSortedSportsData();

  // Fetch events based on the currently selected league
  const { events, loading: eventsLoading, error } = useEventsData(league, {
    pastDays: 7,
    futureDays: 7,
  });

  // State to track which match card is currently expanded
  const [openCardId, setOpenCardId] = React.useState<string | null>(null);
  const [matchView, setMatchView] = React.useState<"all" | "following">(initialView);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [followedTeamIds, setFollowedTeamIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setMatchView(initialView);
  }, [initialView]);

  React.useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      try {
        const context = viewerFid ? null : await getSafeMiniAppContext();
        const fid = viewerFid ?? context?.user?.fid;
        const [teamData, preferences] = await Promise.all([
          fetchTeamLogos(),
          fid ? getTeamPreferences(fid) : Promise.resolve<string[] | null>(null),
        ]);
        if (!cancelled) {
          setTeams(teamData);
          setFollowedTeamIds(preferences ?? []);
        }
      } catch {
        if (!cancelled) {
          setTeams([]);
          setFollowedTeamIds([]);
        }
      }
    };

    void loadPreferences();
    const handlePreferencesUpdated = () => void loadPreferences();
    window.addEventListener(TEAM_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(TEAM_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);
    };
  }, [viewerFid]);

  // When a league button is clicked, update the league via the parent
  const handleLeagueClick = (leagueId: string) => {
    console.log("Selected league:", leagueId);
    setSelectedLeague(leagueId);
  };

  // Handle opening/closing match cards - only one can be open at a time
  const handleCardToggle = (cardId: string) => {
    setOpenCardId(openCardId === cardId ? null : cardId);
  };

  const visibleEvents = React.useMemo(() => {
    if (matchView === "all") return events;
    const followed = new Set(followedTeamIds);
    return events.filter((event: any) => event.competitions?.[0]?.competitors?.some((competitor: any) => {
      const abbreviation = competitor?.team?.abbreviation;
      return abbreviation && followed.has(`${league}-${abbreviation}`);
    }));
  }, [events, followedTeamIds, league, matchView]);

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
      live: visibleEvents
        .filter((event: any) => eventState(event) === "in")
        .sort(byKickoffAscending),
      upcoming: visibleEvents
        .filter((event: any) => eventState(event) === "pre" && !isCompleted(event))
        .sort(byKickoffAscending),
      previous: visibleEvents
        .filter((event: any) => isCompleted(event))
        .sort((left: any, right: any) => byKickoffAscending(right, left)),
    };
  }, [visibleEvents]);

  const followedTeams = followedTeamIds
    .map((teamId) => teams.find((team) => getTeamId(team) === teamId))
    .filter((team): team is Team => Boolean(team));
  const followingSummary = followedTeams.length > 0
    ? `${followedTeams[0].name}${followedTeams.length > 1 ? ` + ${followedTeams.length - 1} ${followedTeams.length === 2 ? "team" : "teams"}` : ""}`
    : "Choose teams to follow";

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
      <div className="mb-4 grid grid-cols-2 rounded-[16px] border border-lightPurple/15 bg-purplePanel/55 p-1" aria-label="Match view">
        <button
          type="button"
          onClick={() => setMatchView("all")}
          aria-pressed={matchView === "all"}
          className={`rounded-[12px] px-3 py-2.5 text-sm font-semibold transition-colors ${matchView === "all" ? "bg-deepPink/20 text-notWhite" : "text-lightPurple hover:text-notWhite"}`}
        >
          All matches
        </button>
        <button
          type="button"
          onClick={() => setMatchView("following")}
          aria-pressed={matchView === "following"}
          className={`rounded-[12px] px-3 py-2.5 text-sm font-semibold transition-colors ${matchView === "following" ? "bg-deepPink/20 text-deepPink" : "text-lightPurple hover:text-notWhite"}`}
        >
          Following
        </button>
      </div>

      {matchView === "following" ? (
        <div className="mb-4 flex items-center gap-3 rounded-[18px] border border-lightPurple/15 bg-purplePanel/70 px-3 py-3">
          <div className="flex min-w-[48px] -space-x-2">
            {followedTeams.slice(0, 3).map((team) => (
              <Image key={getTeamId(team)} src={team.logoUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-full border-2 border-purplePanel object-contain" />
            ))}
            {followedTeams.length === 0 ? <Bell className="h-5 w-5 text-lightPurple/70" aria-hidden="true" /> : null}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-notWhite">{followingSummary}</span>
          <button type="button" onClick={onOpenUpdates} className="rounded-full px-2 py-1 text-xs font-semibold text-deepPink transition-colors hover:bg-deepPink/10">Edit</button>
          <Bell className="h-5 w-5 shrink-0 text-lightPurple" aria-hidden="true" />
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-xl font-bold text-notWhite">Leagues & Cups</h2>
        {matchView === "all" ? <button type="button" onClick={() => setMatchView("following")} className="text-xs font-semibold text-deepPink">See Following</button> : null}
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
        ) : visibleEvents.length > 0 ? (
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
        ) : matchView === "following" ? (
          <div className="rounded-[18px] border border-dashed border-lightPurple/20 px-4 py-7 text-center">
            <Bell className="mx-auto h-6 w-6 text-deepPink" aria-hidden="true" />
            <div className="mt-3 text-sm font-semibold text-notWhite">No followed-team matches here</div>
            <p className="mt-1 text-xs leading-5 text-lightPurple/70">Follow another team or switch leagues to personalize this view.</p>
            <button type="button" onClick={onOpenUpdates} className="mt-3 rounded-full border border-deepPink/30 px-4 py-2 text-xs font-semibold text-deepPink">Edit Following</button>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-lightPurple/70">No matches available for this league.</div>
        )}
      </div>

      {matchView === "following" ? (
        <button type="button" onClick={onOpenUpdates} className="mt-3 flex w-full items-center gap-3 rounded-[18px] border border-lightPurple/15 bg-purplePanel/55 px-4 py-3 text-left">
          <Bell className="h-5 w-5 shrink-0 text-deepPink" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-notWhite">Want fewer alerts?</span>
            <span className="block text-xs text-lightPurple/70">Choose which moments matter in Updates</span>
          </span>
          <span className="text-xs font-semibold text-deepPink">Tune alerts</span>
          <ChevronRight className="h-4 w-4 text-deepPink" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
};

export default MatchesTab;
