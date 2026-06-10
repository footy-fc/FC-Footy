import React from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";
import { BASE_URL } from "~/lib/config";
import { getTeamPreferences } from "../lib/kvPerferences";
import {
  getCountdownToWorldCup,
  getRecommendedWorldCupDate,
  getWorldCupGroupStageDates,
  getWorldCupGroups,
  getWorldCupMatchById,
  getWorldCupMatchDays,
  getWorldCupMatchesForDate,
  getWorldCupTeamByPreferenceId,
  normalizeWorldCupName,
  type WorldCupMatch,
  type WorldCupTeam,
} from "~/lib/worldCupData";
import { normalizeFootyShareUrl } from "~/lib/farcaster/shareUrl";
import { WarpcastShareButton } from "./ui/WarpcastShareButton";
import type { RichMatchEvent } from "~/types/commentatorTypes";

interface HomeTabProps {
  onNavigate: (tab: string) => void;
  viewerFid?: number;
}

type EspnLeader = {
  name?: string;
  leaders?: Array<{
    value?: number;
    displayValue?: string;
    athlete?: {
      displayName?: string;
    };
  }>;
};

type EspnDetail = {
  type?: { text?: string };
  clock?: { displayValue?: string };
  athletesInvolved?: Array<{ displayName?: string }>;
  team?: { id?: string; abbreviation?: string };
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logo?: string;
  };
  leaders?: EspnLeader[];
};

type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: {
    type?: {
      detail?: string;
      description?: string;
      state?: string;
    };
  };
  competitions?: Array<{
    venue?: { fullName?: string };
    status?: {
      type?: {
        detail?: string;
        description?: string;
        state?: string;
      };
    };
    competitors?: EspnCompetitor[];
    details?: EspnDetail[];
  }>;
};

type GroupStandingRow = {
  team: WorldCupTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type MatchSocialPayload = {
  found?: boolean;
  replyCount?: number;
  homeFanCount?: number;
  awayFanCount?: number;
  viewerAffinity?: string;
  suggestions?: Array<{
    id: string;
    label: string;
    text: string;
    mode: "same-side" | "rival-poke" | "player-specific";
  }>;
};

type SupporterProfile = {
  fid: number;
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
};

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function formatDayLabel(date: string) {
  return DAY_FORMATTER.format(new Date(`${date}T12:00:00Z`));
}

function formatFullDateLabel(date: string) {
  return FULL_DATE_FORMATTER.format(new Date(`${date}T12:00:00Z`));
}

function formatMatchTime(match: WorldCupMatch) {
  if (!match.startsAt) {
    return match.time;
  }

  return `${new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(match.startsAt))} local`;
}

function getPreferredWorldCupCountry(teamIds: string[] | null | undefined) {
  const preferences = Array.isArray(teamIds) ? teamIds : [];
  for (const teamId of preferences) {
    const worldCupTeam = getWorldCupTeamByPreferenceId(teamId);
    if (worldCupTeam) {
      return worldCupTeam;
    }
  }

  return null;
}

function findEspnEventForMatch(match: WorldCupMatch, events: EspnEvent[]) {
  const targetHome = normalizeWorldCupName(match.homeTeam.name);
  const targetAway = normalizeWorldCupName(match.awayTeam.name);

  return (
    events.find((event) => {
      const competitors = event.competitions?.[0]?.competitors || [];
      const home = competitors.find((competitor) => competitor.homeAway === "home");
      const away = competitors.find((competitor) => competitor.homeAway === "away");
      const homeName = normalizeWorldCupName(
        home?.team?.displayName || home?.team?.shortDisplayName || home?.team?.abbreviation || ""
      );
      const awayName = normalizeWorldCupName(
        away?.team?.displayName || away?.team?.shortDisplayName || away?.team?.abbreviation || ""
      );

      return homeName === targetHome && awayName === targetAway;
    }) || null
  );
}

function getSelectedCountryMatch(matches: WorldCupMatch[], team: WorldCupTeam | null) {
  if (!team) {
    return null;
  }

  return matches.find((match) => match.homeTeam.fifaCode === team.fifaCode || match.awayTeam.fifaCode === team.fifaCode) || null;
}

function getCountryMatches(team: WorldCupTeam | null) {
  if (!team) {
    return [];
  }

  return getWorldCupMatchDays().flatMap((date) =>
    getWorldCupMatchesForDate(date).filter(
      (match) => match.homeTeam.fifaCode === team.fifaCode || match.awayTeam.fifaCode === team.fifaCode
    )
  );
}

function getNextCountryMatch(team: WorldCupTeam | null, now = new Date()) {
  const nowMs = now.getTime();

  return getCountryMatches(team).find((match) => {
    if (match.startsAt) {
      return new Date(match.startsAt).getTime() >= nowMs;
    }

    return `${match.date}T23:59:59Z` >= now.toISOString();
  }) || null;
}

function formatSupporterDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getCountryForm(
  team: WorldCupTeam | null,
  resultsByMatchId: Record<string, { homeScore: number; awayScore: number }>
) {
  if (!team) {
    return [];
  }

  return getCountryMatches(team)
    .filter((match) => resultsByMatchId[match.id])
    .slice(-3)
    .map((match) => {
      const result = resultsByMatchId[match.id];
      const isHome = match.homeTeam.fifaCode === team.fifaCode;
      const teamScore = isHome ? result.homeScore : result.awayScore;
      const opponentScore = isHome ? result.awayScore : result.homeScore;

      if (teamScore > opponentScore) return "W";
      if (teamScore < opponentScore) return "L";
      return "D";
    });
}

function extractPlayerSignals(event: EspnEvent | null, match: WorldCupMatch | null) {
  if (!event) {
    if (!match) {
      return [];
    }

    return [
      `${match.homeTeam.name} storylines land once live ESPN coverage fills in the player data.`,
      `${match.awayTeam.name} player notes will surface here closer to kickoff.`,
    ];
  }

  const competitors = event.competitions?.[0]?.competitors || [];
  const signals: string[] = [];

  for (const competitor of competitors) {
    const teamName = competitor.team?.displayName || competitor.team?.shortDisplayName || "This side";
    const scoringLeader = competitor.leaders?.find((leader) => /goals/i.test(leader.name || ""));
    const topEntry = scoringLeader?.leaders?.[0];
    if (topEntry?.athlete?.displayName) {
      signals.push(
        `${teamName}: ${topEntry.athlete.displayName} leads the scoring line${topEntry.displayValue ? ` (${topEntry.displayValue})` : ""}.`
      );
    }
  }

  const detailPlayers = (event.competitions?.[0]?.details || [])
    .map((detail) => detail.athletesInvolved?.[0]?.displayName)
    .filter((value): value is string => Boolean(value));

  for (const player of detailPlayers) {
    if (!signals.some((signal) => signal.includes(player))) {
      signals.push(`${player} is already in the match event stream.`);
    }
    if (signals.length >= 4) {
      break;
    }
  }

  return signals.slice(0, 4);
}

function extractKeyMomentSignals(event: EspnEvent | null) {
  const details = event?.competitions?.[0]?.details || [];
  return details
    .slice(-4)
    .map((detail) => {
      const label = detail.type?.text || "Match update";
      const player = detail.athletesInvolved?.[0]?.displayName;
      const minute = detail.clock?.displayValue;
      return [label, player, minute ? `at ${minute}` : null].filter(Boolean).join(" ");
    })
    .filter(Boolean);
}

function toRichMatchEvents(event: EspnEvent | null): RichMatchEvent[] {
  const competitors = event?.competitions?.[0]?.competitors || [];
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const away = competitors.find((competitor) => competitor.homeAway === "away");

  return (event?.competitions?.[0]?.details || [])
    .map((detail, index) => {
      const abbreviation =
        detail.team?.id === home?.team?.id
          ? home?.team?.abbreviation
          : detail.team?.id === away?.team?.id
            ? away?.team?.abbreviation
            : detail.team?.abbreviation;

      return {
        type: { text: detail.type?.text || `Event ${index + 1}` },
        clock: { displayValue: detail.clock?.displayValue || "" },
        team: {
          id: detail.team?.id || "",
          abbreviation: abbreviation || "",
        },
        athletesInvolved: (detail.athletesInvolved || []).map((athlete) => ({
          displayName: athlete.displayName || "",
        })),
      };
    })
    .filter((detail) => detail.type.text);
}

function getMatchStatusLabel(match: WorldCupMatch, event: EspnEvent | null) {
  const detail = event?.competitions?.[0]?.status?.type?.detail || event?.status?.type?.detail;
  if (detail) {
    return detail;
  }

  return `${match.round}${match.group ? ` • ${match.group}` : ""}`;
}

function getMatchScoreLabel(event: EspnEvent | null) {
  const competitors = event?.competitions?.[0]?.competitors || [];
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  if (!home || !away || home.score == null || away.score == null) {
    return null;
  }

  return `${home.score} - ${away.score}`;
}

function getMatchNumericScores(event: EspnEvent | null) {
  const competitors = event?.competitions?.[0]?.competitors || [];
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  const homeScore = Number(home?.score);
  const awayScore = Number(away?.score);
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return null;
  }

  return { homeScore, awayScore };
}

function hasMatchStarted(event: EspnEvent | null) {
  const state = event?.competitions?.[0]?.status?.type?.state || event?.status?.type?.state;
  return state === "in" || state === "post";
}

function buildShareUrl(match: WorldCupMatch, event: EspnEvent | null) {
  const frameUrlRaw = BASE_URL || "https://fc-footy.vercel.app";
  const frameUrl = frameUrlRaw.startsWith("http") ? frameUrlRaw : `https://${frameUrlRaw}`;
  const search = new URLSearchParams();
  search.set("tab", "matches");
  search.set("league", "fifa.world");
  search.set("home", match.homeTeam.name);
  search.set("away", match.awayTeam.name);
  search.set("homeScore", String(getMatchNumericScores(event)?.homeScore || 0));
  search.set("awayScore", String(getMatchNumericScores(event)?.awayScore || 0));
  search.set("status", getMatchStatusLabel(match, event));
  search.set("isLive", String(Boolean(event)));
  return normalizeFootyShareUrl(`${frameUrl}?${search.toString()}`);
}

function buildEmptyStandings() {
  return getWorldCupGroups().map(({ group, teams }) => ({
    group,
    rows: teams.map((team) => ({
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    })),
  }));
}

function sortStandingsRows(rows: GroupStandingRow[]) {
  return [...rows].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    if (right.goalDifference !== left.goalDifference) return right.goalDifference - left.goalDifference;
    if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
    return left.team.name.localeCompare(right.team.name);
  });
}

const HomeTab: React.FC<HomeTabProps> = ({ onNavigate, viewerFid }) => {
  const [favoriteTeamIds, setFavoriteTeamIds] = React.useState<string[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<string>(() => getRecommendedWorldCupDate(new Date()) || "");
  const [selectedMatchId, setSelectedMatchId] = React.useState<string | null>(null);
  const [espnEvents, setEspnEvents] = React.useState<EspnEvent[]>([]);
  const [isLoadingEspn, setIsLoadingEspn] = React.useState(false);
  const [groupStandings, setGroupStandings] = React.useState<{ group: string; rows: GroupStandingRow[] }[]>(() => buildEmptyStandings());
  const [resultsByMatchId, setResultsByMatchId] = React.useState<Record<string, { homeScore: number; awayScore: number }>>({});
  const [isLoadingStandings, setIsLoadingStandings] = React.useState(false);
  const [socialContext, setSocialContext] = React.useState<MatchSocialPayload | null>(null);
  const [isLoadingSocial, setIsLoadingSocial] = React.useState(false);
  const [supporterProfiles, setSupporterProfiles] = React.useState<SupporterProfile[]>([]);
  const { ready, authenticated } = usePrivy();
  const { hasFarcaster, runtime, fid: managedFid } = useFootyFarcaster();
  const primaryCountry = getPreferredWorldCupCountry(favoriteTeamIds);

  React.useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      try {
        let fid = viewerFid;
        if (!fid) {
          await sdk.actions.ready();
          const context = await sdk.context;
          fid = context?.user?.fid;
        }
        if (!fid) {
          return;
        }

        const preferences = await getTeamPreferences(fid);
        if (!cancelled) {
          setFavoriteTeamIds(Array.isArray(preferences) ? preferences : []);
        }
      } catch (error) {
        console.warn("HomeTab World Cup preference bootstrap skipped:", error);
        if (!cancelled) {
          setFavoriteTeamIds([]);
        }
      }
    };

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [viewerFid]);

  React.useEffect(() => {
    if (!primaryCountry?.id) {
      setSupporterProfiles([]);
      return;
    }

    let cancelled = false;

    const loadSupporters = async () => {
      try {
        const response = await fetch(`/api/fanclubs/supporters?teamId=${encodeURIComponent(primaryCountry.id)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as { supporters?: SupporterProfile[] } | null;
        if (!cancelled) {
          setSupporterProfiles(Array.isArray(payload?.supporters) ? payload!.supporters.filter((supporter) => supporter?.pfpUrl) : []);
        }
      } catch (error) {
        console.warn("Unable to load supporter profiles:", error);
        if (!cancelled) {
          setSupporterProfiles([]);
        }
      }
    };

    void loadSupporters();

    return () => {
      cancelled = true;
    };
  }, [primaryCountry?.id]);

  React.useEffect(() => {
    if (!selectedDate) {
      setEspnEvents([]);
      return;
    }

    let cancelled = false;
    const dateKey = selectedDate.replaceAll("-", "");

    const loadEspnDay = async () => {
      setIsLoadingEspn(true);
      try {
        const response = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateKey}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`World Cup scoreboard request failed with ${response.status}`);
        }

        const payload = (await response.json()) as { events?: EspnEvent[] };
        if (!cancelled) {
          setEspnEvents(Array.isArray(payload.events) ? payload.events : []);
        }
      } catch (error) {
        console.warn("World Cup scoreboard enrichment unavailable:", error);
        if (!cancelled) {
          setEspnEvents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEspn(false);
        }
      }
    };

    void loadEspnDay();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  React.useEffect(() => {
    let cancelled = false;
    const selectedDateKey = selectedDate || new Date().toISOString().slice(0, 10);
    const datesToLoad = getWorldCupGroupStageDates().filter((date) => date <= selectedDateKey);

    if (datesToLoad.length === 0) {
      setGroupStandings(buildEmptyStandings());
      return;
    }

    const loadStandings = async () => {
      setIsLoadingStandings(true);
      try {
        const payloads = await Promise.all(
          datesToLoad.map(async (date) => {
            const response = await fetch(
              `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date.replaceAll("-", "")}`,
              { cache: "no-store" }
            );
            if (!response.ok) {
              return { date, events: [] as EspnEvent[] };
            }

            const payload = (await response.json()) as { events?: EspnEvent[] };
            return { date, events: Array.isArray(payload.events) ? payload.events : [] };
          })
        );

        const standingsMap = new Map<string, GroupStandingRow[]>();
        const nextResultsByMatchId: Record<string, { homeScore: number; awayScore: number }> = {};
        for (const { group, teams } of getWorldCupGroups()) {
          standingsMap.set(
            group,
            teams.map((team) => ({
              team,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              goalDifference: 0,
              points: 0,
            }))
          );
        }

        for (const match of datesToLoad.flatMap((date) => getWorldCupMatchesForDate(date)).filter((match) => Boolean(match.group))) {
          const event = payloads.find((payload) => payload.date === match.date)
            ? findEspnEventForMatch(match, payloads.find((payload) => payload.date === match.date)?.events || [])
            : null;
          const scores = getMatchNumericScores(event);
          if (!scores || !match.group || !hasMatchStarted(event)) {
            continue;
          }

          nextResultsByMatchId[match.id] = scores;

          const groupRows = standingsMap.get(match.group);
          if (!groupRows) {
            continue;
          }

          const homeRow = groupRows.find((row) => row.team.fifaCode === match.homeTeam.fifaCode);
          const awayRow = groupRows.find((row) => row.team.fifaCode === match.awayTeam.fifaCode);
          if (!homeRow || !awayRow) {
            continue;
          }

          homeRow.played += 1;
          awayRow.played += 1;
          homeRow.goalsFor += scores.homeScore;
          homeRow.goalsAgainst += scores.awayScore;
          awayRow.goalsFor += scores.awayScore;
          awayRow.goalsAgainst += scores.homeScore;
          homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;
          awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;

          if (scores.homeScore > scores.awayScore) {
            homeRow.won += 1;
            awayRow.lost += 1;
            homeRow.points += 3;
          } else if (scores.homeScore < scores.awayScore) {
            awayRow.won += 1;
            homeRow.lost += 1;
            awayRow.points += 3;
          } else {
            homeRow.drawn += 1;
            awayRow.drawn += 1;
            homeRow.points += 1;
            awayRow.points += 1;
          }
        }

        if (!cancelled) {
          setResultsByMatchId(nextResultsByMatchId);
          setGroupStandings(
            Array.from(standingsMap.entries())
              .map(([group, rows]) => ({ group, rows: sortStandingsRows(rows) }))
              .sort((left, right) => left.group.localeCompare(right.group))
          );
        }
      } catch (error) {
        console.warn("Unable to build World Cup group standings from ESPN scoreboards:", error);
        if (!cancelled) {
          setResultsByMatchId({});
          setGroupStandings(buildEmptyStandings());
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStandings(false);
        }
      }
    };

    void loadStandings();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const matchDays = getWorldCupMatchDays();
  const matchesForSelectedDate = selectedDate ? getWorldCupMatchesForDate(selectedDate) : [];

  React.useEffect(() => {
    if (!matchesForSelectedDate.length) {
      setSelectedMatchId(null);
      return;
    }

    const currentMatch = getWorldCupMatchById(selectedMatchId);
    if (currentMatch && currentMatch.date === selectedDate) {
      return;
    }

    const featuredMatch = getSelectedCountryMatch(matchesForSelectedDate, primaryCountry) || matchesForSelectedDate[0];
    setSelectedMatchId(featuredMatch.id);
  }, [matchesForSelectedDate, primaryCountry, selectedDate, selectedMatchId]);

  const selectedMatch = getWorldCupMatchById(selectedMatchId) || matchesForSelectedDate[0] || null;
  const selectedEvent = selectedMatch ? findEspnEventForMatch(selectedMatch, espnEvents) : null;

  React.useEffect(() => {
    if (!selectedMatch) {
      setSocialContext(null);
      return;
    }

    let cancelled = false;
    const loadSocial = async () => {
      setIsLoadingSocial(true);
      try {
        const response = await fetch("/api/worldcup/match-social", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shareUrl: buildShareUrl(selectedMatch, selectedEvent),
            viewerFid: viewerFid || managedFid || undefined,
            selectedMatch: {
              homeTeam: selectedMatch.homeTeam.name,
              awayTeam: selectedMatch.awayTeam.name,
              homeCode: selectedMatch.homeTeam.fifaCode,
              awayCode: selectedMatch.awayTeam.fifaCode,
              competition: "fifa.world",
              espnEventId: selectedEvent?.id,
              matchDate: selectedMatch.date,
              keyMoments: extractKeyMomentSignals(selectedEvent),
              matchEvents: toRichMatchEvents(selectedEvent),
            },
          }),
        });

        const payload = (await response.json().catch(() => null)) as MatchSocialPayload | null;
        if (!cancelled) {
          setSocialContext(response.ok ? payload : null);
        }
      } catch (error) {
        console.warn("Unable to load World Cup social context:", error);
        if (!cancelled) {
          setSocialContext(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSocial(false);
        }
      }
    };

    void loadSocial();

    return () => {
      cancelled = true;
    };
  }, [managedFid, selectedEvent, selectedMatch, viewerFid]);

  const selectedScore = getMatchScoreLabel(selectedEvent);
  const numericScores = getMatchNumericScores(selectedEvent);
  const playerSignals = extractPlayerSignals(selectedEvent, selectedMatch);
  const keyMoments = extractKeyMomentSignals(selectedEvent);
  const featuredCountryMatch = getSelectedCountryMatch(matchesForSelectedDate, primaryCountry);
  const nextCountryMatch = getNextCountryMatch(primaryCountry, new Date());
  const countryForm = getCountryForm(primaryCountry, resultsByMatchId);
  const countdownDays = getCountdownToWorldCup(new Date());
  const todayKey = new Date().toISOString().slice(0, 10);
  const tournamentStarted = countdownDays === 0 || todayKey >= (matchDays[0] || "");
  const selectedGroupStandings = selectedMatch?.group
    ? groupStandings.find((group) => group.group === selectedMatch.group) || null
    : null;
  const primaryCountryStanding = primaryCountry?.group
    ? groupStandings.find((group) => group.group === `Group ${primaryCountry.group}`)?.rows.find((row) => row.team.fifaCode === primaryCountry.fifaCode) || null
    : null;
  const primaryCountryRank = primaryCountry?.group
    ? (groupStandings.find((group) => group.group === `Group ${primaryCountry.group}`)?.rows.findIndex((row) => row.team.fifaCode === primaryCountry.fifaCode) ?? -1) + 1
    : 0;
  const visibleSupporters = supporterProfiles.slice(0, 8);
  const hiddenSupporterCount = Math.max(0, supporterProfiles.length - visibleSupporters.length);
  const orderedGroupStandings = selectedGroupStandings
    ? [selectedGroupStandings, ...groupStandings.filter((group) => group.group !== selectedGroupStandings.group)]
    : groupStandings;
  const selectedMatchShare = selectedMatch
    ? {
        competitorsLong: `${selectedMatch.homeTeam.name} vs ${selectedMatch.awayTeam.name}`,
        homeTeam: selectedMatch.homeTeam.name,
        awayTeam: selectedMatch.awayTeam.name,
        homeTeamId: selectedMatch.homeTeam.fifaCode || undefined,
        awayTeamId: selectedMatch.awayTeam.fifaCode || undefined,
        homeScore: numericScores?.homeScore || 0,
        awayScore: numericScores?.awayScore || 0,
        clock: getMatchStatusLabel(selectedMatch, selectedEvent),
        homeLogo: "",
        awayLogo: "",
        eventStarted: Boolean(selectedEvent),
        matchDate: selectedMatch.date,
        espnEventId: selectedEvent?.id,
        keyMoments,
        matchEvents: toRichMatchEvents(selectedEvent),
        competition: "fifa.world",
        eventId: selectedMatch.id,
      }
    : null;

  return (
    <div className="mb-4">
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Home</div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="app-title">World Cup 2026</h2>
              <div className="app-micro mt-1">
                {tournamentStarted
                  ? "The daily panel for fixtures, standings, supporter energy, and the live match conversation."
                  : countdownDays != null
                    ? `${countdownDays} days until kickoff.`
                    : "The daily panel fans come back to all tournament month."}
              </div>
          </div>
          <button
            onClick={() => onNavigate("fanClubs")}
            title="Set your country and follows"
            aria-label="Set your country and follows"
            className="shrink-0 self-end rounded-full border border-[#f6d36d]/25 bg-[#f6d36d]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f9dfa1] transition-colors hover:bg-[#f6d36d]/18"
          >
            {primaryCountry ? "Edit fav" : "Pick fav"}
          </button>
        </div>
      </div>

      {ready && authenticated && runtime !== "miniapp" && !hasFarcaster ? (
        <div className="mb-4 rounded-[22px] border border-deepPink/30 bg-purplePanel p-4 text-lightPurple">
          <div className="app-card-title mb-2">Finish your Footy profile</div>
          <div className="mb-3 text-sm text-lightPurple">
            Profile handles account creation inside Footy, including your Farcaster identity and signer.
          </div>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className="rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85"
          >
            Open Profile setup
          </button>
        </div>
      ) : null}

      <div className="space-y-4">
        <section className="overflow-hidden rounded-[30px] border border-[#f6d36d]/18 bg-[radial-gradient(circle_at_top_left,rgba(246,211,109,0.18),transparent_26%),linear-gradient(150deg,rgba(17,11,31,0.98),rgba(29,17,45,0.98))] p-5 text-notWhite shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[40rem]">
              <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#f8dda6]/80">
                {primaryCountry ? `${primaryCountry.name} supporters` : "World Cup home"}
              </div>
              <div className="text-[34px] font-semibold leading-[0.98] text-notWhite">
                {primaryCountry ? `${primaryCountry.flag}` : "Pick a country. Find your people. Live the tournament together."}
              </div>
              {primaryCountry ? null : (
                <div className="mt-3 max-w-[36rem] text-sm leading-6 text-lightPurple">
                  Home should feel like a camp, not a scoreboard. Choose a country and the entire World Cup view starts bending toward your side.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!primaryCountry ? (
                <>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-lightPurple">
                    {selectedDate ? formatFullDateLabel(selectedDate) : "Tournament view"}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-lightPurple">
                    {matchesForSelectedDate.length} fixtures
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {primaryCountry ? (
            <div className="mt-5 grid gap-3 md:grid-cols-[1.08fr,0.92fr]">
              <button
                type="button"
                onClick={() => {
                  if (!nextCountryMatch) return;
                  setSelectedDate(nextCountryMatch.date);
                  setSelectedMatchId(nextCountryMatch.id);
                }}
                className="rounded-[22px] border border-[#f6d36d]/18 bg-[#f6d36d]/8 px-4 py-4 text-left transition-colors hover:bg-[#f6d36d]/12"
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#f8dda6]/75">Next match</div>
                <div className="mt-2 text-xl font-semibold leading-tight text-notWhite">
                  {nextCountryMatch
                    ? `${nextCountryMatch.homeTeam.flag} ${nextCountryMatch.homeTeam.name} vs ${nextCountryMatch.awayTeam.flag} ${nextCountryMatch.awayTeam.name}`
                    : `${primaryCountry.flag} ${primaryCountry.name}`}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-lightPurple">
                    {nextCountryMatch ? formatFullDateLabel(nextCountryMatch.date) : `Group ${primaryCountry.group || "TBD"}`}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-lightPurple">
                    {nextCountryMatch ? nextCountryMatch.stadium?.name || nextCountryMatch.ground : primaryCountry.confederation || primaryCountry.continent}
                  </div>
                </div>
              </button>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-lightPurple/70">Supporters</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-sm text-lightPurple">
                        {primaryCountryStanding
                          ? `Group ${primaryCountry.group} • #${primaryCountryRank} • ${primaryCountryStanding.points} pts`
                          : `Group ${primaryCountry.group || "TBD"} • ${primaryCountry.confederation || primaryCountry.continent}`}
                      </div>
                      <div className="flex gap-2">
                        {(countryForm.length > 0 ? countryForm : ["-", "-", "-"]).map((result, index) => (
                          <span
                            key={`${result}-${index}`}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${
                              result === "W"
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                : result === "L"
                                  ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                                  : result === "D"
                                    ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                                    : "border-white/10 bg-white/5 text-lightPurple"
                            }`}
                          >
                            {result}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid min-h-[100px] grid-cols-4 gap-2 content-end">
                      {visibleSupporters.map((supporter) => (
                        <div
                          key={supporter.fid}
                          className="h-11 w-11 overflow-hidden rounded-full border border-white/10 bg-white/5"
                          title={supporter.displayName || supporter.username || `FID ${supporter.fid}`}
                        >
                          <img
                            src={supporter.pfpUrl || ""}
                            alt={supporter.displayName || supporter.username || "Supporter"}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                      {hiddenSupporterCount > 0 ? (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#f6d36d]/20 bg-[#f6d36d]/8 text-xs font-semibold text-[#f8dda6]">
                          +{hiddenSupporterCount}
                        </div>
                      ) : null}
                      {visibleSupporters.length === 0 ? (
                        <div className="col-span-4 flex min-h-[100px] items-end rounded-[18px] border border-dashed border-white/10 px-3 py-3 text-sm text-lightPurple">
                          Supporter faces will populate here as England fans connect their Farcaster profiles.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="app-section-title">Match calendar</div>
            </div>
            {isLoadingEspn ? <div className="text-[11px] uppercase tracking-[0.14em] text-lightPurple/70">Refreshing live layer</div> : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {matchDays.map((day) => {
              const dayMatches = getWorldCupMatchesForDate(day);
              const isSelected = day === selectedDate;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`min-w-[104px] rounded-[18px] border px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-[#f6d36d]/40 bg-[#f6d36d]/12 text-notWhite"
                      : "border-white/10 bg-white/5 text-lightPurple hover:bg-white/10"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.14em]">{formatDayLabel(day)}</div>
                  <div className="mt-1 text-sm font-semibold">{dayMatches.length} matches</div>
                  <div className="mt-1 text-[11px] text-lightPurple/80">{day}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="app-section-title">Fixture state</div>
                <div className="app-micro">
                  {selectedDate ? `${formatFullDateLabel(selectedDate)}. Start here for the scores and live state.` : "Tournament fixtures"}
                </div>
              </div>
            </div>
            <div className="-mx-1 overflow-x-auto pb-1">
              <div className="flex min-w-max gap-3 px-1">
                {matchesForSelectedDate.map((match) => {
                  const event = findEspnEventForMatch(match, espnEvents);
                  const score = getMatchScoreLabel(event);
                  const isSelected = selectedMatch?.id === match.id;
                  const isCountryFixture = Boolean(
                    primaryCountry && (match.homeTeam.fifaCode === primaryCountry.fifaCode || match.awayTeam.fifaCode === primaryCountry.fifaCode)
                  );

                  return (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => setSelectedMatchId(match.id)}
                      className={`w-[288px] flex-none rounded-[24px] border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-[#f6d36d]/35 bg-[#f6d36d]/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-lightPurple/75">
                          {getMatchStatusLabel(match, event)}
                        </div>
                        <div className="text-[11px] text-lightPurple/80">
                          {score || formatMatchTime(match)}
                        </div>
                      </div>
                      <div className="space-y-2 text-notWhite">
                        <div className="text-lg font-semibold">{match.homeTeam.flag} {match.homeTeam.name}</div>
                        <div className="text-lg font-semibold">{match.awayTeam.flag} {match.awayTeam.name}</div>
                      </div>
                      {score ? <div className="mt-4 text-2xl font-semibold tracking-[0.08em] text-notWhite">{score}</div> : null}
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-lightPurple">
                        <span>{match.group || match.round}</span>
                        <span>{isCountryFixture ? "Your country match" : match.stadium?.name || match.ground}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="app-section-title">Group stage</div>
                <div className="app-micro">
                  {selectedGroupStandings ? `Table` : "Standings computed from completed World Cup results."}
                </div>
              </div>
              {isLoadingStandings ? <div className="text-[11px] uppercase tracking-[0.14em] text-lightPurple/70">Updating table</div> : null}
            </div>
            {orderedGroupStandings.length > 0 ? (
              <div className="-mx-1 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-3 px-1">
                  {orderedGroupStandings.map((group) => {
                    const isSelectedGroup = selectedGroupStandings?.group === group.group;
                    return (
                      <div
                        key={group.group}
                        className={`w-[320px] flex-none rounded-[22px] border px-4 py-4 ${
                          isSelectedGroup ? "border-[#f6d36d]/28 bg-[#f6d36d]/10" : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-lg font-semibold text-notWhite">{group.group}</div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-lightPurple/70">
                            {isSelectedGroup ? "selected match group" : "group table"}
                          </div>
                        </div>
                        <div className="grid grid-cols-[28px,1fr,32px,32px,36px,32px] gap-2 border-b border-white/10 pb-2 text-[10px] uppercase tracking-[0.14em] text-lightPurple/60">
                          <span>#</span>
                          <span>Team</span>
                          <span>P</span>
                          <span>GD</span>
                          <span>GF</span>
                          <span>Pts</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          {group.rows.map((row, index) => {
                            const isFavorite = primaryCountry?.fifaCode === row.team.fifaCode;
                            return (
                              <div
                                key={row.team.id}
                                className={`grid grid-cols-[28px,1fr,32px,32px,36px,32px] gap-2 rounded-[14px] px-2 py-2 text-sm ${
                                  isFavorite ? "bg-white/10 text-notWhite" : "text-lightPurple"
                                }`}
                              >
                                <span className="font-semibold">{index + 1}</span>
                                <span className="truncate">
                                  {row.team.flag} {row.team.name}
                                </span>
                                <span>{row.played}</span>
                                <span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
                                <span>{row.goalsFor}</span>
                                <span className="font-semibold text-notWhite">{row.points}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-3 text-sm text-lightPurple">
                Knockout fixtures do not carry a group table. Select a group-stage match day to see the live standings element.
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
            <div className="mb-3">
              <div className="app-section-title">Match spotlight</div>
              <div className="app-micro">After the scores, this is the one fixture to sink into.</div>
            </div>
            {selectedMatch ? (
              <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(140deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-lightPurple/75">
                      {selectedMatch.round}{selectedMatch.group ? ` • ${selectedMatch.group}` : ""}
                    </div>
                    <div className="mt-2 text-2xl font-semibold leading-tight text-notWhite">
                      {selectedMatch.homeTeam.flag} {selectedMatch.homeTeam.name} vs {selectedMatch.awayTeam.flag} {selectedMatch.awayTeam.name}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-lightPurple">
                      {selectedEvent
                        ? getMatchStatusLabel(selectedMatch, selectedEvent)
                        : `${selectedMatch.ground} • ${selectedMatch.stadium?.name || "Host venue confirmed"}`}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-notWhite">
                    {selectedScore || formatMatchTime(selectedMatch)}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3 text-sm text-lightPurple">
                  <div className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-notWhite">Host city:</span> {selectedMatch.ground}
                  </div>
                  <div className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-notWhite">Venue:</span> {selectedMatch.stadium?.name || "TBD"}
                  </div>
                  <div className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-notWhite">Kickoff:</span> {selectedMatch.time}
                  </div>
                </div>
                {socialContext?.suggestions && socialContext.suggestions.length > 0 ? (
                  <div className="mt-4 rounded-[16px] border border-white/10 bg-darkPurple px-3 py-3">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-lightPurple/70">Banter angle</div>
                    <div className="text-sm text-notWhite">{socialContext.suggestions[0]?.text}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-lightPurple">
                No World Cup match is selected yet.
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
            <div className="mb-3">
              <div className="app-section-title">Key moments</div>
              <div className="app-micro">The live pulse before you decide whether to jump into the room.</div>
            </div>
            {keyMoments.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {keyMoments.map((moment) => (
                  <div key={moment} className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-notWhite">
                    {moment}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-white/10 px-3 py-3 text-sm text-lightPurple">
                No live match events on this fixture yet. Before kickoff, Home stays focused on the scoreline, the group race, and who is showing up for each side.
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
            <div className="mb-3">
              <div className="app-section-title">Players to watch</div>
              <div className="app-micro">Who is shaping the match once you move past the score.</div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {playerSignals.map((signal) => (
                <div key={signal} className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-notWhite">
                  {signal}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="app-section-title">Fan pulse</div>
                <div className="app-micro">See where the Footy social graph is leaning before you join the conversation.</div>
              </div>
              {isLoadingSocial ? <div className="text-[11px] uppercase tracking-[0.14em] text-lightPurple/70">Reading the room</div> : null}
            </div>
            {selectedMatch ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-lightPurple/70">Backing {selectedMatch.homeTeam.name}</div>
                  <div className="mt-2 text-2xl font-semibold text-notWhite">{socialContext?.homeFanCount ?? 0}</div>
                  <div className="mt-1 text-xs leading-5 text-lightPurple">
                    Footy supporters mapped through country follows and legacy international badges.
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-lightPurple/70">Backing {selectedMatch.awayTeam.name}</div>
                  <div className="mt-2 text-2xl font-semibold text-notWhite">{socialContext?.awayFanCount ?? 0}</div>
                  <div className="mt-1 text-xs leading-5 text-lightPurple">
                    This is the social graph layer, not a generic sports data feed.
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {selectedMatchShare ? (
            <section className="rounded-[24px] border border-[#f6d36d]/18 bg-[linear-gradient(180deg,rgba(246,211,109,0.08),rgba(255,255,255,0.02))] p-4 text-lightPurple">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[#f8dda6]/75">Cast into the match</div>
                  <div className="mt-2 text-lg font-semibold text-notWhite">Join the room when you have the score, the table, and a side to talk from.</div>
                  <div className="mt-1 text-sm leading-6 text-lightPurple">
                    This uses the same reply-to-parent-url flow as the scores tab, so every cast lands in the shared match thread instead of a disconnected side channel.
                  </div>
                </div>
                <div className="shrink-0 text-sm text-notWhite">
                  {socialContext?.found ? `${socialContext.replyCount || 0} replies live` : "start the room"}
                </div>
              </div>
              <WarpcastShareButton selectedMatch={selectedMatchShare} leagueId="fifa.world" />
            </section>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default HomeTab;
