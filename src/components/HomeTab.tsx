import React from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";
import { getTeamPreferences } from "../lib/kvPerferences";
import {
  getCountdownToWorldCup,
  formatLocalDateKey,
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

interface HomeTabProps {
  onNavigate: (tab: string) => void;
  viewerFid?: number;
}

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
  };
};

type EspnEvent = {
  status?: {
    type?: {
      detail?: string;
      state?: string;
    };
  };
  competitions?: Array<{
    status?: {
      type?: {
        detail?: string;
        state?: string;
      };
    };
    competitors?: EspnCompetitor[];
  }>;
};

type ScoresApiPayload = {
  success?: boolean;
  data?: {
    events?: EspnEvent[];
  };
  events?: EspnEvent[];
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

function formatCompactDay(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatMonthLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatDayNumber(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getTournamentScoreboardCutoff(now = new Date()) {
  const matchDays = getWorldCupMatchDays();
  if (matchDays.length === 0) {
    return null;
  }

  const todayKey = formatLocalDateKey(now);
  if (todayKey < matchDays[0]) {
    return null;
  }

  if (todayKey > matchDays[matchDays.length - 1]) {
    return matchDays[matchDays.length - 1];
  }

  return todayKey;
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

function buildTeamMatchNames(values: Array<string | null | undefined>) {
  const names = new Set<string>();
  for (const value of values) {
    if (!value) {
      continue;
    }

    const normalized = normalizeWorldCupName(value);
    if (!normalized) {
      continue;
    }

    names.add(normalized);
    names.add(normalized.replace(/\band\b/g, " ").replace(/\s+/g, " ").trim());
  }

  return names;
}

function getCompetitorTeamNames(competitor: EspnCompetitor | undefined) {
  return buildTeamMatchNames([
    competitor?.team?.displayName,
    competitor?.team?.shortDisplayName,
    competitor?.team?.abbreviation,
  ]);
}

function hasSharedTeamName(left: Set<string>, right: Set<string>) {
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }

  return false;
}

function findEspnEventForMatch(match: WorldCupMatch, events: EspnEvent[]) {
  const targetHomeNames = buildTeamMatchNames([match.homeTeam.name, match.homeTeam.normalizedName, match.homeTeam.fifaCode]);
  const targetAwayNames = buildTeamMatchNames([match.awayTeam.name, match.awayTeam.normalizedName, match.awayTeam.fifaCode]);

  return (
    events.find((event) => {
      const competitors = event.competitions?.[0]?.competitors || [];
      const home = competitors.find((competitor) => competitor.homeAway === "home");
      const away = competitors.find((competitor) => competitor.homeAway === "away");
      const homeNames = getCompetitorTeamNames(home);
      const awayNames = getCompetitorTeamNames(away);

      return hasSharedTeamName(targetHomeNames, homeNames) && hasSharedTeamName(targetAwayNames, awayNames);
    }) || null
  );
}

function getSelectedCountryMatch(matches: WorldCupMatch[], team: WorldCupTeam | null) {
  if (!team) {
    return null;
  }

  return matches.find((match) => match.homeTeam.fifaCode === team.fifaCode || match.awayTeam.fifaCode === team.fifaCode) || null;
}

function getEventState(event: EspnEvent | null) {
  return event?.competitions?.[0]?.status?.type?.state || event?.status?.type?.state || null;
}

function getFixtureStateBadge(match: WorldCupMatch, event: EspnEvent | null) {
  const state = getEventState(event);
  if (state === "in") {
    return {
      label: "Live",
      tone: "live" as const,
    };
  }

  if (state === "post") {
    return {
      label: "Full time",
      tone: "final" as const,
    };
  }

  return {
    label: formatMatchTime(match),
    tone: "time" as const,
  };
}

function getMatchScoreLabel(event: EspnEvent | null) {
  if (!hasMatchStarted(event)) {
    return null;
  }

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

async function fetchWorldCupScoreboardEvents(date: string) {
  const dateKey = date.replaceAll("-", "");
  const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateKey}`;

  try {
    const espnResponse = await fetch(espnUrl, { cache: "no-store" });
    if (!espnResponse.ok) {
      throw new Error(`World Cup scoreboard request failed with ${espnResponse.status}`);
    }

    const payload = (await espnResponse.json()) as ScoresApiPayload;
    return Array.isArray(payload.events) ? payload.events : [];
  } catch (espnError) {
    const apiResponse = await fetch(`/api/scores?league=fifa.world&dates=${dateKey}`, { cache: "no-store" });
    if (!apiResponse.ok) {
      throw espnError;
    }

    const payload = (await apiResponse.json()) as ScoresApiPayload;
    const events = payload.data?.events || payload.events;
    return Array.isArray(events) ? events : [];
  }
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
  const [scoreboardEventsByDate, setScoreboardEventsByDate] = React.useState<Record<string, EspnEvent[]>>({});
  const [isLoadingEspn, setIsLoadingEspn] = React.useState(false);
  const [groupStandings, setGroupStandings] = React.useState<{ group: string; rows: GroupStandingRow[] }[]>(() => buildEmptyStandings());
  const [isLoadingStandings, setIsLoadingStandings] = React.useState(false);
  const { ready, authenticated } = usePrivy();
  const { hasFarcaster, runtime } = useFootyFarcaster();
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

  const matchDays = getWorldCupMatchDays();
  const liveScoreboardCutoff = getTournamentScoreboardCutoff(new Date());

  React.useEffect(() => {
    const datesToLoad = Array.from(
      new Set([selectedDate, liveScoreboardCutoff].filter((date): date is string => Boolean(date)))
    );
    if (datesToLoad.length === 0) {
      return;
    }

    let cancelled = false;

    const loadVisibleScoreboards = async () => {
      setIsLoadingEspn(true);
      try {
        const results = await Promise.all(
          datesToLoad.map(async (date) => ({
            date,
            events: await fetchWorldCupScoreboardEvents(date),
          }))
        );
        if (!cancelled) {
          setScoreboardEventsByDate((current) => {
            const next = { ...current };
            for (const { date, events } of results) {
              next[date] = events;
            }
            return next;
          });
        }
      } catch (error) {
        console.warn("World Cup scoreboard enrichment unavailable:", error);
      } finally {
        if (!cancelled) {
          setIsLoadingEspn(false);
        }
      }
    };

    void loadVisibleScoreboards();

    return () => {
      cancelled = true;
    };
  }, [liveScoreboardCutoff, selectedDate]);

  React.useEffect(() => {
    let cancelled = false;
    const datesToLoad = liveScoreboardCutoff
      ? getWorldCupGroupStageDates().filter((date) => date <= liveScoreboardCutoff)
      : [];

    if (datesToLoad.length === 0) {
      setGroupStandings(buildEmptyStandings());
      return;
    }

    const loadStandings = async () => {
      setIsLoadingStandings(true);
      try {
        const payloads = await Promise.all(
          datesToLoad.map(async (date) => ({
            date,
            events: await fetchWorldCupScoreboardEvents(date),
          }))
        );

        if (!cancelled) {
          setScoreboardEventsByDate((current) => {
            const next = { ...current };
            for (const { date, events } of payloads) {
              next[date] = events;
            }
            return next;
          });
        }

        const standingsMap = new Map<string, GroupStandingRow[]>();
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

        for (const match of datesToLoad.flatMap((date) => getWorldCupMatchesForDate(date)).filter((item) => Boolean(item.group))) {
          const dayPayload = payloads.find((payload) => payload.date === match.date);
          const event = dayPayload ? findEspnEventForMatch(match, dayPayload.events) : null;
          const scores = getMatchNumericScores(event);
          if (!scores || !match.group || !hasMatchStarted(event)) {
            continue;
          }

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
          setGroupStandings(
            Array.from(standingsMap.entries())
              .map(([group, rows]) => ({ group, rows: sortStandingsRows(rows) }))
              .sort((left, right) => left.group.localeCompare(right.group))
          );
        }
      } catch (error) {
        console.warn("Unable to build World Cup group standings from ESPN scoreboards:", error);
        if (!cancelled) {
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
  }, [liveScoreboardCutoff]);

  const matchesForSelectedDate = React.useMemo(
    () => (selectedDate ? getWorldCupMatchesForDate(selectedDate) : []),
    [selectedDate]
  );

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
  const countdownDays = getCountdownToWorldCup(new Date());
  const todayKey = formatLocalDateKey(new Date());
  const tournamentStarted = countdownDays === 0 || todayKey >= (matchDays[0] || "");
  const espnEvents = selectedDate ? scoreboardEventsByDate[selectedDate] || [] : [];
  const selectedGroupStandings = selectedMatch?.group
    ? groupStandings.find((group) => group.group === selectedMatch.group) || null
    : null;
  const orderedGroupStandings = selectedGroupStandings
    ? [selectedGroupStandings, ...groupStandings.filter((group) => group.group !== selectedGroupStandings.group)]
    : groupStandings;

  return (
    <div className="mb-4">
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Home</div>
        <div>
          <h2 className="app-title">World Cup 2026</h2>
          <div className="app-micro mt-1">
            {tournamentStarted
              ? "The daily panel for fixtures and standings."
              : countdownDays != null
                ? `${countdownDays} days until kickoff.`
                : "The daily panel fans come back to all tournament month."}
          </div>
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
                  className={`min-w-[104px] rounded-[20px] border px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-[#f6d36d]/40 bg-[#f6d36d]/12 text-notWhite"
                      : "border-white/10 bg-white/5 text-lightPurple hover:bg-white/10"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.16em] text-lightPurple/70">{formatCompactDay(day)}</div>
                  <div className="mt-2 flex items-end gap-2">
                    <div className="text-3xl font-semibold leading-none text-notWhite">{formatDayNumber(day)}</div>
                    <div className="pb-1 text-[11px] uppercase tracking-[0.16em] text-lightPurple/70">{formatMonthLabel(day)}</div>
                  </div>
                  <div className="mt-3 text-sm font-semibold">{dayMatches.length} matches</div>
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
                <div className="app-micro">Live scores and kickoff state.</div>
              </div>
            </div>
            {matchesForSelectedDate.length > 0 ? (
              <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,8,22,0.96),rgba(6,10,24,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="space-y-3">
                  {matchesForSelectedDate.map((match) => {
                    const event = findEspnEventForMatch(match, espnEvents);
                    const score = getMatchScoreLabel(event);
                    const isSelected = selectedMatch?.id === match.id;
                    const isCountryFixture = Boolean(
                      primaryCountry && (match.homeTeam.fifaCode === primaryCountry.fifaCode || match.awayTeam.fifaCode === primaryCountry.fifaCode)
                    );
                    const stateBadge = getFixtureStateBadge(match, event);
                    const competitionLabel = match.group || match.round;
                    const homeScore = score ? score.split(" - ")[0] : null;
                    const awayScore = score ? score.split(" - ")[1] : null;

                    return (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => setSelectedMatchId(match.id)}
                        className={`w-full rounded-[22px] border p-4 text-left transition-colors ${
                          isSelected
                            ? "border-[#f6d36d]/30 bg-[linear-gradient(180deg,rgba(246,211,109,0.08),rgba(255,255,255,0.03))]"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="rounded-full border border-white/10 bg-darkPurple px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-lightPurple/75">
                            {competitionLabel}
                          </div>
                          <div
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              stateBadge.tone === "live"
                                ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                : stateBadge.tone === "final"
                                  ? "border border-white/10 bg-white/5 text-notWhite"
                                  : "border border-white/10 bg-white/5 text-lightPurple/80"
                            }`}
                          >
                            {stateBadge.label}
                          </div>
                        </div>

                        <div className="grid grid-cols-[78px,1fr,78px] items-center gap-3">
                          <div className="text-center">
                            <div className="text-[28px] leading-none">{match.homeTeam.flag}</div>
                            <div className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-[#ffb194]">
                              {match.homeTeam.fifaCode || match.homeTeam.name.slice(0, 3).toUpperCase()}
                            </div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-lightPurple/55">
                              {homeScore ?? ""}
                            </div>
                          </div>

                          <div className="text-center">
                          <div className="text-[14px] font-semibold uppercase tracking-[0.18em] text-lightPurple/65">
                              {score ? (stateBadge.tone === "final" ? "Final" : "Live") : "Kickoff"}
                            </div>
                            <div className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#ffb194]">
                              {score || "VS"}
                            </div>
                            <div className="mt-2 text-[15px] font-semibold text-lightPurple/85">
                              {score ? stateBadge.label : formatMatchTime(match)}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-[28px] leading-none">{match.awayTeam.flag}</div>
                            <div className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-[#ffb194]">
                              {match.awayTeam.fifaCode || match.awayTeam.name.slice(0, 3).toUpperCase()}
                            </div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-lightPurple/55">
                              {awayScore ?? ""}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3 border-t border-white/10 pt-4 text-xs">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-lightPurple/80">{match.homeTeam.name}</div>
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-lightPurple/60">
                            {isCountryFixture ? "Your match" : "Match"}
                          </div>
                          <div className="min-w-0 text-right">
                            <div className="truncate font-semibold text-lightPurple/80">{match.awayTeam.name}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-lightPurple/60">
                          <span className="truncate">{match.stadium?.name || match.ground}</span>
                          <span className="shrink-0">{match.ground}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-3 text-sm text-lightPurple">
                No fixtures are listed for this date.
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="app-section-title">Group stage</div>
                <div className="app-micro">
                  {selectedGroupStandings ? "Table" : "Standings computed from completed World Cup results."}
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
        </section>
      </div>
    </div>
  );
};

export default HomeTab;
