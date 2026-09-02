export type RivalsStanding = {
  entry: number;
  rank: number;
  total: number;
  event_total?: number;
  entry_name?: string;
  player_name?: string;
  fid?: number | null;
  username?: string | null;
  display_name?: string | null;
};

export type RivalsPick = {
  element: number;
  multiplier: number;
  is_captain?: boolean;
};

export type RivalsBootstrapPlayer = {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  selected_by_percent?: string;
};

export type RivalsBootstrapTeam = {
  id: number;
  short_name: string;
  name: string;
};

export type RivalsLiveStat = {
  identifier: string;
  points: number;
  value: number;
};

export type RivalsLiveElement = {
  id: number;
  stats: {
    minutes?: number;
    goals_scored?: number;
    assists?: number;
    clean_sheets?: number;
    goals_conceded?: number;
    bonus?: number;
    total_points?: number;
  };
  explain?: Array<{ fixture: number; stats: RivalsLiveStat[] }>;
};

export type RivalsFixture = {
  id: number;
  started?: boolean;
  finished?: boolean;
  finished_provisional?: boolean;
  minutes?: number;
  kickoff_time?: string;
};

export type RivalsImpactKind = "goal" | "assist" | "clean-sheet" | "clean-sheet-loss" | "bonus";

export type RivalsImpactEvent = {
  id: string;
  playerId: number;
  playerName: string;
  club: string;
  minute: number;
  fixtureId: number;
  kickoffTime?: string;
  kind: RivalsImpactKind;
  headline: string;
  eventType: string;
  rawPoints: number;
  userMultiplier: number;
  rivalMultiplier: number;
  userImpact: number;
  rivalImpact: number;
  relativeSwing: number;
  userCaptain: boolean;
  rivalCaptain: boolean;
  explanation: {
    title: string;
    detail: string;
  };
};

export type RivalsEmptyState = "loading" | "no-linked-team" | "no-mini-league" | "no-live-match" | "api-error" | null;

export type RivalsInteractionState = {
  sheet: "banter" | "explain" | null;
  selectedReply: string;
  castStatus: "idle" | "posting" | "posted" | "error";
  joinedContest: boolean;
};

export type RivalsInteractionAction =
  | { type: "open-banter"; reply: string }
  | { type: "open-explain" }
  | { type: "close-sheet" }
  | { type: "select-reply"; reply: string }
  | { type: "cast-posting" }
  | { type: "cast-posted" }
  | { type: "cast-error" }
  | { type: "join-contest" };

export const initialRivalsInteractionState: RivalsInteractionState = {
  sheet: null,
  selectedReply: "",
  castStatus: "idle",
  joinedContest: false,
};

export function rivalsInteractionReducer(
  state: RivalsInteractionState,
  action: RivalsInteractionAction
): RivalsInteractionState {
  switch (action.type) {
    case "open-banter":
      return { ...state, sheet: "banter", selectedReply: action.reply, castStatus: "idle" };
    case "open-explain":
      return { ...state, sheet: "explain", castStatus: "idle" };
    case "close-sheet":
      return { ...state, sheet: null, castStatus: "idle" };
    case "select-reply":
      return { ...state, selectedReply: action.reply, castStatus: "idle" };
    case "cast-posting":
      return { ...state, castStatus: "posting" };
    case "cast-posted":
      return { ...state, castStatus: "posted" };
    case "cast-error":
      return { ...state, castStatus: "error" };
    case "join-contest":
      return { ...state, joinedContest: true };
    default:
      return state;
  }
}

export function calculatePointSwing(rawPoints: number, userMultiplier: number, rivalMultiplier: number) {
  const userImpact = rawPoints * Math.max(0, userMultiplier);
  const rivalImpact = rawPoints * Math.max(0, rivalMultiplier);
  return {
    userImpact,
    rivalImpact,
    relativeSwing: userImpact - rivalImpact,
  };
}

export function selectNearestRival(standings: RivalsStanding[], userEntryId: number): RivalsStanding | null {
  const user = standings.find((standing) => standing.entry === userEntryId);
  if (!user) return null;

  return (
    standings
      .filter((standing) => standing.entry !== userEntryId)
      .sort((left, right) => {
        const pointsGap = Math.abs(left.total - user.total) - Math.abs(right.total - user.total);
        if (pointsGap !== 0) return pointsGap;
        const rankGap = Math.abs(left.rank - user.rank) - Math.abs(right.rank - user.rank);
        if (rankGap !== 0) return rankGap;
        return left.entry - right.entry;
      })[0] ?? null
  );
}

export function resolveRivalsEmptyState(input: {
  loading: boolean;
  error?: string | null;
  entryId?: number | null;
  hasMiniLeague: boolean;
  hasLiveMatch: boolean;
  eventCount: number;
}): RivalsEmptyState {
  if (input.loading) return "loading";
  if (input.error) return "api-error";
  if (!input.entryId) return "no-linked-team";
  if (!input.hasMiniLeague) return "no-mini-league";
  if (!input.hasLiveMatch || input.eventCount === 0) return "no-live-match";
  return null;
}

export function calculateLivePoints(picks: RivalsPick[], liveElements: RivalsLiveElement[], transferCost = 0) {
  const pointsByPlayer = new Map(liveElements.map((element) => [element.id, element.stats.total_points ?? 0]));
  return picks.reduce((total, pick) => total + (pointsByPlayer.get(pick.element) ?? 0) * Math.max(0, pick.multiplier), 0) - transferCost;
}

function getMultiplier(picks: RivalsPick[], playerId: number) {
  return picks.find((pick) => pick.element === playerId)?.multiplier ?? 0;
}

function isCaptain(picks: RivalsPick[], playerId: number) {
  return Boolean(picks.find((pick) => pick.element === playerId)?.is_captain);
}

function getStatPoints(stats: RivalsLiveStat[], identifier: string, fallback: number) {
  const matching = stats.filter((stat) => stat.identifier === identifier);
  return matching.length > 0 ? matching.reduce((total, stat) => total + Number(stat.points || 0), 0) : fallback;
}

function getKindLabel(kind: RivalsImpactKind) {
  switch (kind) {
    case "goal":
      return "Goal";
    case "assist":
      return "Assist";
    case "clean-sheet":
      return "Clean sheet";
    case "clean-sheet-loss":
      return "Clean sheet loss";
    case "bonus":
      return "Bonus update";
  }
}

function getHeadline(playerName: string, club: string, kind: RivalsImpactKind, captain: boolean) {
  const captainSuffix = captain ? " (C)" : "";
  switch (kind) {
    case "goal":
      return `${playerName} (${club}) scores${captainSuffix}`;
    case "assist":
      return `${playerName} (${club}) assists${captainSuffix}`;
    case "clean-sheet":
      return `${playerName} (${club}) clean sheet holds${captainSuffix}`;
    case "clean-sheet-loss":
      return `${playerName} (${club}) clean sheet lost${captainSuffix}`;
    case "bonus":
      return `${playerName} (${club}) bonus rises${captainSuffix}`;
  }
}

function getEventType(kind: RivalsImpactKind, selectedBy: number, userCaptain: boolean, relativeSwing: number) {
  if (userCaptain && relativeSwing > 0) return "Captain return";
  if ((kind === "goal" || kind === "assist") && selectedBy < 10) return "Differential return";
  if (Math.abs(relativeSwing) >= 8) return "Major rival swing";
  return getKindLabel(kind);
}

function getExplanationTitle(kind: RivalsImpactKind, userCaptain: boolean, rivalCaptain: boolean) {
  if (userCaptain || rivalCaptain) return "Captaincy multiplied the swing.";
  if (kind === "clean-sheet-loss") return "The goal wiped the clean-sheet points.";
  if (kind === "bonus") return "Live bonus changed the gap.";
  return "Ownership created the swing.";
}

function getExplanationDetail(input: {
  playerName: string;
  kind: RivalsImpactKind;
  rawPoints: number;
  userMultiplier: number;
  rivalMultiplier: number;
  rivalName: string;
  relativeSwing: number;
}) {
  const eventLabel = getKindLabel(input.kind).toLowerCase();
  const direction = input.relativeSwing > 0 ? "in your favour" : input.relativeSwing < 0 ? `in ${input.rivalName}'s favour` : "with no relative change";
  return `${input.playerName}'s ${eventLabel} is worth ${signedPoints(input.rawPoints)} before multipliers. Your squad applies ×${input.userMultiplier}; ${input.rivalName} applies ×${input.rivalMultiplier}. That moves the head-to-head ${signedPoints(Math.abs(input.relativeSwing))} ${direction}.`;
}

export function signedPoints(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

export function deriveImpactEvents(input: {
  players: RivalsBootstrapPlayer[];
  teams: RivalsBootstrapTeam[];
  userPicks: RivalsPick[];
  rivalPicks: RivalsPick[];
  liveElements: RivalsLiveElement[];
  fixtures: RivalsFixture[];
  rivalName: string;
}): RivalsImpactEvent[] {
  const players = new Map(input.players.map((player) => [player.id, player]));
  const teams = new Map(input.teams.map((team) => [team.id, team]));
  const fixtures = new Map(input.fixtures.map((fixture) => [fixture.id, fixture]));
  const relevantIds = new Set([...input.userPicks, ...input.rivalPicks].map((pick) => pick.element));
  const events: RivalsImpactEvent[] = [];

  for (const liveElement of input.liveElements) {
    if (!relevantIds.has(liveElement.id)) continue;
    const player = players.get(liveElement.id);
    if (!player) continue;
    const team = teams.get(player.team);
    const userMultiplier = getMultiplier(input.userPicks, player.id);
    const rivalMultiplier = getMultiplier(input.rivalPicks, player.id);
    const userCaptain = isCaptain(input.userPicks, player.id);
    const rivalCaptain = isCaptain(input.rivalPicks, player.id);
    const selectedBy = Number(player.selected_by_percent ?? 0);
    const explanations = liveElement.explain?.length
      ? liveElement.explain
      : [{ fixture: input.fixtures[0]?.id ?? 0, stats: [] as RivalsLiveStat[] }];

    for (const explanation of explanations) {
      const fixture = fixtures.get(explanation.fixture);
      if (!fixture?.started || fixture.finished || fixture.finished_provisional) continue;
      const stats = explanation.stats ?? [];
      const contributions: Array<{ kind: RivalsImpactKind; rawPoints: number }> = [];

      const goals = stats.some((stat) => stat.identifier === "goals_scored")
        ? getStatPoints(stats, "goals_scored", 0)
        : (liveElement.stats.goals_scored ?? 0) * (player.element_type <= 2 ? 6 : player.element_type === 3 ? 5 : 4);
      const assists = stats.some((stat) => stat.identifier === "assists")
        ? getStatPoints(stats, "assists", 0)
        : (liveElement.stats.assists ?? 0) * 3;
      const cleanSheet = stats.some((stat) => stat.identifier === "clean_sheets")
        ? getStatPoints(stats, "clean_sheets", 0)
        : (liveElement.stats.clean_sheets ?? 0) > 0
          ? player.element_type <= 2 ? 4 : player.element_type === 3 ? 1 : 0
          : 0;
      const bonus = stats.some((stat) => stat.identifier === "bonus")
        ? getStatPoints(stats, "bonus", 0)
        : liveElement.stats.bonus ?? 0;

      if (goals > 0) contributions.push({ kind: "goal", rawPoints: goals });
      if (assists > 0) contributions.push({ kind: "assist", rawPoints: assists });
      if (cleanSheet > 0) contributions.push({ kind: "clean-sheet", rawPoints: cleanSheet });
      if (
        cleanSheet === 0 &&
        (liveElement.stats.goals_conceded ?? 0) > 0 &&
        (liveElement.stats.minutes ?? 0) >= 60 &&
        player.element_type <= 2
      ) {
        contributions.push({ kind: "clean-sheet-loss", rawPoints: -4 });
      }
      if (bonus > 0) contributions.push({ kind: "bonus", rawPoints: bonus });

      for (const contribution of contributions) {
        const swing = calculatePointSwing(contribution.rawPoints, userMultiplier, rivalMultiplier);
        if (swing.userImpact === 0 && swing.rivalImpact === 0) continue;
        const eventType = getEventType(contribution.kind, selectedBy, userCaptain, swing.relativeSwing);
        events.push({
          id: `${explanation.fixture}-${player.id}-${contribution.kind}`,
          playerId: player.id,
          playerName: player.web_name,
          club: team?.short_name ?? "FPL",
          minute: fixture.minutes ?? liveElement.stats.minutes ?? 0,
          fixtureId: explanation.fixture,
          kickoffTime: fixture.kickoff_time,
          kind: contribution.kind,
          headline: getHeadline(player.web_name, team?.short_name ?? "FPL", contribution.kind, userCaptain),
          eventType,
          rawPoints: contribution.rawPoints,
          userMultiplier,
          rivalMultiplier,
          ...swing,
          userCaptain,
          rivalCaptain,
          explanation: {
            title: getExplanationTitle(contribution.kind, userCaptain, rivalCaptain),
            detail: getExplanationDetail({
              playerName: player.web_name,
              kind: contribution.kind,
              rawPoints: contribution.rawPoints,
              userMultiplier,
              rivalMultiplier,
              rivalName: input.rivalName,
              relativeSwing: swing.relativeSwing,
            }),
          },
        });
      }
    }
  }

  const priority: Record<RivalsImpactKind, number> = {
    goal: 5,
    assist: 4,
    "clean-sheet-loss": 3,
    "clean-sheet": 2,
    bonus: 1,
  };

  return events
    .sort((left, right) => {
      const kickoff = Date.parse(right.kickoffTime ?? "") - Date.parse(left.kickoffTime ?? "");
      if (Number.isFinite(kickoff) && kickoff !== 0) return kickoff;
      if (right.minute !== left.minute) return right.minute - left.minute;
      const relevance = Math.abs(right.relativeSwing) - Math.abs(left.relativeSwing);
      if (relevance !== 0) return relevance;
      return priority[right.kind] - priority[left.kind];
    })
    .slice(0, 8);
}

export function buildBanterOptions(event: RivalsImpactEvent, rivalName: string) {
  const swing = signedPoints(Math.abs(event.relativeSwing));
  if (event.relativeSwing >= 0) {
    return [
      `${event.playerName}. Never in doubt.`,
      `${rivalName}, that ${swing}-point swing is going to leave a mark.`,
      `${event.minute}′ and the gap is already moving my way.`,
    ];
  }
  return [
    `${rivalName}, enjoy that one while it lasts.`,
    `${event.playerName} just made this far too interesting.`,
    `${swing} points the wrong way. I want a recount.`,
  ];
}
