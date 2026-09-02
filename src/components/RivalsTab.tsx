"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CircleHelp,
  CircleUserRound,
  Copyright,
  Crown,
  Goal,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ShieldOff,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  WifiOff,
  X,
} from "lucide-react";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";
import { FPL_LEAGUE_ID } from "~/lib/config";
import {
  buildBanterOptions,
  calculateLivePoints,
  deriveImpactEvents,
  initialRivalsInteractionState,
  resolveRivalsEmptyState,
  rivalsInteractionReducer,
  selectNearestRival,
  signedPoints,
  type RivalsBootstrapPlayer,
  type RivalsBootstrapTeam,
  type RivalsFixture,
  type RivalsImpactEvent,
  type RivalsLiveElement,
  type RivalsPick,
  type RivalsStanding,
} from "~/lib/rivals";

type FplEvent = {
  id: number;
  name?: string;
  is_current?: boolean;
  is_next?: boolean;
  finished?: boolean;
};

type BootstrapPayload = {
  events?: FplEvent[];
  elements?: RivalsBootstrapPlayer[];
  teams?: RivalsBootstrapTeam[];
};

type PicksPayload = {
  picks?: RivalsPick[];
  entry_history?: {
    points?: number;
    overall_rank?: number;
    event_transfers_cost?: number;
  };
};

type HistoryPayload = {
  data?: {
    current?: Array<{ event: number; overall_rank?: number }>;
  };
};

type LivePayload = {
  live?: { elements?: RivalsLiveElement[] };
  fixtures?: RivalsFixture[];
};

type RivalsModel = {
  entryId: number | null;
  gameweek: number;
  points: number;
  overallRank: number | null;
  rankDirection: "up" | "down" | "flat";
  userName: string;
  rivalName: string;
  rivalDelta: number;
  hasMiniLeague: boolean;
  hasLiveMatch: boolean;
  events: RivalsImpactEvent[];
};

const initialModel: RivalsModel = {
  entryId: null,
  gameweek: 0,
  points: 0,
  overallRank: null,
  rankDirection: "flat",
  userName: "Your squad",
  rivalName: "nearest rival",
  rivalDelta: 0,
  hasMiniLeague: false,
  hasLiveMatch: false,
  events: [],
};

function displayManagerName(standing: RivalsStanding | null | undefined, fallback: string) {
  return standing?.display_name || standing?.username || standing?.player_name || standing?.entry_name || fallback;
}

function formatRank(rank: number | null) {
  return rank ? new Intl.NumberFormat("en-US").format(rank) : "—";
}

function getRankDirection(current: number | null, previous: number | null) {
  if (!current || !previous || current === previous) return "flat" as const;
  return current < previous ? "up" as const : "down" as const;
}

function demoEvents(): RivalsImpactEvent[] {
  return [
    {
      id: "demo-salah-goal",
      playerId: 1,
      playerName: "Salah",
      club: "LIV",
      minute: 72,
      fixtureId: 1,
      kickoffTime: "2026-09-01T18:00:00Z",
      kind: "goal",
      headline: "Salah (LIV) scores (C)",
      eventType: "Captain return",
      rawPoints: 6,
      userMultiplier: 2,
      rivalMultiplier: 0,
      userImpact: 12,
      rivalImpact: 0,
      relativeSwing: 12,
      userCaptain: true,
      rivalCaptain: false,
      explanation: {
        title: "Captaincy doubled the swing.",
        detail: "Salah's goal is worth +6 before multipliers. Your squad applies ×2; Tom applies ×0. That moves the head-to-head +12 in your favour.",
      },
    },
    {
      id: "demo-trent-clean-sheet",
      playerId: 2,
      playerName: "Trent",
      club: "LIV",
      minute: 58,
      fixtureId: 1,
      kickoffTime: "2026-09-01T18:00:00Z",
      kind: "clean-sheet-loss",
      headline: "Trent (LIV) clean sheet lost",
      eventType: "Clean sheet loss",
      rawPoints: -4,
      userMultiplier: 1,
      rivalMultiplier: 0,
      userImpact: -4,
      rivalImpact: 0,
      relativeSwing: -4,
      userCaptain: false,
      rivalCaptain: false,
      explanation: {
        title: "The goal wiped the clean-sheet points.",
        detail: "Trent's clean-sheet loss is worth −4 before multipliers. Your squad applies ×1; Tom applies ×0. That moves the head-to-head +4 in Tom's favour.",
      },
    },
    {
      id: "demo-eze-goal",
      playerId: 3,
      playerName: "Eze",
      club: "CRY",
      minute: 33,
      fixtureId: 2,
      kickoffTime: "2026-09-01T17:30:00Z",
      kind: "goal",
      headline: "Eze (CRY) scores",
      eventType: "Differential return",
      rawPoints: 5,
      userMultiplier: 0,
      rivalMultiplier: 1,
      userImpact: 0,
      rivalImpact: 5,
      relativeSwing: -5,
      userCaptain: false,
      rivalCaptain: false,
      explanation: {
        title: "Ownership created the swing.",
        detail: "Eze's goal is worth +5 before multipliers. Your squad applies ×0; Tom applies ×1. That moves the head-to-head +5 in Tom's favour.",
      },
    },
  ];
}

function getEventIcon(event: RivalsImpactEvent) {
  if (event.userCaptain || event.rivalCaptain) return <Copyright aria-hidden="true" />;
  if (event.kind === "clean-sheet-loss") return <ShieldOff aria-hidden="true" />;
  if (event.eventType === "Differential return") return <Star aria-hidden="true" />;
  if (event.kind === "goal") return <Goal aria-hidden="true" />;
  if (event.kind === "assist") return <Sparkles aria-hidden="true" />;
  return <Star aria-hidden="true" />;
}

function RivalsStateCard({
  state,
  onPrimary,
}: {
  state: Exclude<ReturnType<typeof resolveRivalsEmptyState>, null>;
  onPrimary: () => void;
}) {
  const content = {
    loading: {
      icon: <LoaderCircle className="animate-spin" aria-hidden="true" />,
      eyebrow: "Syncing FPL",
      title: "Finding the moments that moved your week",
      body: "We’re matching your squad to live player points and the manager closest to you.",
      action: "",
    },
    "no-linked-team": {
      icon: <CircleUserRound aria-hidden="true" />,
      eyebrow: "FPL team needed",
      title: "Link the squad you actually manage",
      body: "Claim your FPL entry from Fantasy, then Rivals can show exactly who each moment helped or hurt.",
      action: "Link FPL team",
    },
    "no-mini-league": {
      icon: <UsersRound aria-hidden="true" />,
      eyebrow: "No nearby rivals yet",
      title: "Your team isn’t in FC Fantasy",
      body: "Join the Footy mini-league to unlock a nearest rival and live head-to-head swings here.",
      action: "View FC Fantasy",
    },
    "no-live-match": {
      icon: <WifiOff aria-hidden="true" />,
      eyebrow: "Between matches",
      title: "No fantasy-impact moments are live",
      body: "Your squad and nearest rival are connected. Come back at kickoff and this timeline will update with goals, clean sheets, bonus and rank swings.",
      action: "Check again",
    },
    "api-error": {
      icon: <AlertTriangle aria-hidden="true" />,
      eyebrow: "FPL data paused",
      title: "The live feed couldn’t refresh",
      body: "Your team link is safe. The public FPL API is temporarily unavailable, so try the feed again in a moment.",
      action: "Retry",
    },
  }[state];

  return (
    <section className="rivals-state-card" aria-live="polite">
      <div className="rivals-state-icon">{content.icon}</div>
      <div className="app-eyebrow">{content.eyebrow}</div>
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      {content.action ? (
        <button type="button" onClick={onPrimary}>
          {state === "api-error" || state === "no-live-match" ? <RefreshCw aria-hidden="true" /> : null}
          {content.action}
        </button>
      ) : (
        <div className="rivals-loading-bars" aria-hidden="true"><span /><span /><span /></div>
      )}
    </section>
  );
}

export default function RivalsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demo = searchParams?.get("rivalsDemo") === "1";
  const [model, setModel] = useState<RivalsModel>(initialModel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [activeEvent, setActiveEvent] = useState<RivalsImpactEvent | null>(null);
  const [interaction, dispatch] = useReducer(rivalsInteractionReducer, initialRivalsInteractionState);
  const {
    activeFid,
    canWrite,
    getAuthorizationHeaders,
    advanceOnboarding,
    signCast,
    submitSignedMessage,
  } = useFootyFarcaster();

  useEffect(() => {
    if (demo) {
      setModel({
        entryId: 101,
        gameweek: 4,
        points: 47,
        overallRank: 124876,
        rankDirection: "up",
        userName: "KMac & Cheese",
        rivalName: "Tom",
        rivalDelta: 4,
        hasMiniLeague: true,
        hasLiveMatch: true,
        events: demoEvents(),
      });
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!activeFid) {
          if (!cancelled) setModel(initialModel);
          return;
        }

        const authHeaders = await getAuthorizationHeaders();
        const claimResponse = await fetch("/api/fpl-claim/status", {
          headers: authHeaders,
          cache: "no-store",
        });
        const claimPayload = (await claimResponse.json().catch(() => ({}))) as {
          byFid?: { entryId?: number } | null;
          error?: string;
        };
        if (!claimResponse.ok && claimResponse.status !== 404) {
          throw new Error(claimPayload.error || "Unable to find your linked FPL team");
        }
        const entryId = claimPayload.byFid?.entryId ?? null;
        if (!entryId) {
          if (!cancelled) setModel({ ...initialModel, entryId: null });
          return;
        }

        const [bootstrapResponse, leagueResponse, historyResponse] = await Promise.all([
          fetch("/api/fpl-bootstrap", { cache: "no-store" }),
          fetch(`/api/fpl-league?leagueId=${FPL_LEAGUE_ID}&includeManagersInfo=1`, { cache: "no-store" }),
          fetch(`/api/fpl-manager-history?entryId=${entryId}`, { cache: "no-store" }),
        ]);
        if (!bootstrapResponse.ok || !leagueResponse.ok) {
          throw new Error("The FPL squad or mini-league feed is unavailable");
        }

        const bootstrap = (await bootstrapResponse.json()) as BootstrapPayload;
        const league = (await leagueResponse.json()) as { standings?: { results?: RivalsStanding[] } };
        const history = historyResponse.ok ? ((await historyResponse.json()) as HistoryPayload) : null;
        const events = bootstrap.events ?? [];
        const currentEvent =
          events.find((event) => event.is_current) ||
          events.find((event) => event.is_next) ||
          [...events].reverse().find((event) => event.finished);
        if (!currentEvent) throw new Error("No FPL gameweek is currently available");

        const standings = league.standings?.results ?? [];
        const userStanding = standings.find((standing) => standing.entry === entryId) ?? null;
        const nearestRival = selectNearestRival(standings, entryId);
        if (!userStanding || !nearestRival) {
          if (!cancelled) {
            setModel({ ...initialModel, entryId, gameweek: currentEvent.id, hasMiniLeague: false });
          }
          return;
        }

        const [userPicksResponse, rivalPicksResponse, liveResponse] = await Promise.all([
          fetch(`/api/manager-picks?entryId=${entryId}&gameweek=${currentEvent.id}`, { cache: "no-store" }),
          fetch(`/api/manager-picks?entryId=${nearestRival.entry}&gameweek=${currentEvent.id}`, { cache: "no-store" }),
          fetch(`/api/fpl-live?gameweek=${currentEvent.id}`, { cache: "no-store" }),
        ]);
        if (!userPicksResponse.ok || !rivalPicksResponse.ok || !liveResponse.ok) {
          throw new Error("Live player points are temporarily unavailable");
        }

        const userPicksPayload = (await userPicksResponse.json()) as PicksPayload;
        const rivalPicksPayload = (await rivalPicksResponse.json()) as PicksPayload;
        const livePayload = (await liveResponse.json()) as LivePayload;
        const userPicks = userPicksPayload.picks ?? [];
        const rivalPicks = rivalPicksPayload.picks ?? [];
        const liveElements = livePayload.live?.elements ?? [];
        const fixtures = livePayload.fixtures ?? [];
        const rivalName = displayManagerName(nearestRival, "nearest rival");
        const userName = displayManagerName(userStanding, "Your squad");
        const impactEvents = deriveImpactEvents({
          players: bootstrap.elements ?? [],
          teams: bootstrap.teams ?? [],
          userPicks,
          rivalPicks,
          liveElements,
          fixtures,
          rivalName,
        });
        const userPoints = calculateLivePoints(
          userPicks,
          liveElements,
          userPicksPayload.entry_history?.event_transfers_cost ?? 0
        );
        const rivalPoints = calculateLivePoints(
          rivalPicks,
          liveElements,
          rivalPicksPayload.entry_history?.event_transfers_cost ?? 0
        );
        const userBaseline = userStanding.total - (userStanding.event_total ?? 0);
        const rivalBaseline = nearestRival.total - (nearestRival.event_total ?? 0);
        const currentRank = userPicksPayload.entry_history?.overall_rank ?? null;
        const previousRank =
          history?.data?.current?.find((row) => row.event === Math.max(1, currentEvent.id - 1))?.overall_rank ?? null;

        if (!cancelled) {
          setModel({
            entryId,
            gameweek: currentEvent.id,
            points: userPoints || userPicksPayload.entry_history?.points || 0,
            overallRank: currentRank,
            rankDirection: getRankDirection(currentRank, previousRank),
            userName,
            rivalName,
            rivalDelta: userBaseline + userPoints - (rivalBaseline + rivalPoints),
            hasMiniLeague: true,
            hasLiveMatch: fixtures.some((fixture) => Boolean(fixture.started && !fixture.finished && !fixture.finished_provisional)),
            events: impactEvents,
          });
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load Rivals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeFid, demo, getAuthorizationHeaders, retryToken]);

  const emptyState = resolveRivalsEmptyState({
    loading,
    error,
    entryId: model.entryId,
    hasMiniLeague: model.hasMiniLeague,
    hasLiveMatch: model.hasLiveMatch,
    eventCount: model.events.length,
  });

  const banterOptions = useMemo(
    () => (activeEvent ? buildBanterOptions(activeEvent, model.rivalName) : []),
    [activeEvent, model.rivalName]
  );

  const openBanter = (event: RivalsImpactEvent) => {
    const replies = buildBanterOptions(event, model.rivalName);
    setActiveEvent(event);
    dispatch({ type: "open-banter", reply: replies[0] ?? "" });
  };

  const openExplain = (event: RivalsImpactEvent) => {
    setActiveEvent(event);
    dispatch({ type: "open-explain" });
  };

  const postBanter = async () => {
    if (!interaction.selectedReply) return;
    if (!canWrite) {
      try {
        await advanceOnboarding();
      } catch {
        dispatch({ type: "cast-error" });
      }
      return;
    }

    dispatch({ type: "cast-posting" });
    try {
      const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/?tab=fanClubs`;
      const signedMessage = await signCast({
        text: interaction.selectedReply,
        embeds: shareUrl ? [shareUrl] : [],
      });
      await submitSignedMessage(signedMessage);
      dispatch({ type: "cast-posted" });
    } catch {
      dispatch({ type: "cast-error" });
    }
  };

  const handleStateAction = () => {
    if (emptyState === "no-linked-team" || emptyState === "no-mini-league") {
      router.push("/?tab=fantasy");
      return;
    }
    setRetryToken((value) => value + 1);
  };

  return (
    <div className="rivals-tab" data-testid="rivals-tab">
      <section className="rivals-live-summary" aria-label="Live gameweek summary">
        <div className="rivals-live-label">
          <span className={model.hasLiveMatch ? "is-live" : ""} aria-hidden="true" />
          <span>Gameweek {model.gameweek || "—"}</span>
          <span aria-hidden="true">·</span>
          <strong>{model.hasLiveMatch ? "Live" : "Waiting"}</strong>
        </div>
        <div className="rivals-summary-stats">
          <span className="rivals-points"><b>{model.points}</b> pts</span>
          <span className="rivals-rank">
            {formatRank(model.overallRank)}
            {model.rankDirection === "up" ? <ArrowUp aria-label="Rank up" /> : null}
            {model.rankDirection === "down" ? <ArrowDown aria-label="Rank down" /> : null}
          </span>
        </div>
      </section>

      <header className="rivals-header">
        <div>
          <h1>Rivals</h1>
          <p>Live fantasy impact, explained.</p>
        </div>
        {model.hasMiniLeague ? (
          <div className="rivals-delta" aria-label={`Your gap to ${model.rivalName} is ${model.rivalDelta} points`}>
            <span>{model.rivalDelta >= 0 ? `You lead ${model.rivalName}` : `${model.rivalName} leads`}</span>
            <strong>{signedPoints(model.rivalDelta)}</strong>
          </div>
        ) : null}
      </header>

      {emptyState ? (
        <RivalsStateCard state={emptyState} onPrimary={handleStateAction} />
      ) : (
        <>
          <section className="rivals-impact-feed" aria-label="Fantasy impact moments">
            <div className="rivals-timeline-line" aria-hidden="true" />
            {model.events.map((event, index) => (
              <article className={`rivals-impact-row${index === 0 ? " is-active" : ""}`} key={event.id}>
                <div className="rivals-moment-marker">
                  <span className={`rivals-minute${index === 0 ? " is-latest" : ""}`}>{event.minute}′</span>
                  <span className={`rivals-event-icon rivals-event-${event.kind}`} aria-hidden="true">
                    {getEventIcon(event)}
                  </span>
                </div>
                <div className="rivals-impact-card">
                  <h2>
                    {event.userCaptain ? event.headline.replace(/ \(C\)$/, "") : event.headline}
                    {event.userCaptain ? <em> (C)</em> : null}
                  </h2>
                  <p className="rivals-impact-type">{event.eventType}</p>
                  <div className={`rivals-swing ${event.relativeSwing >= 0 ? "is-gain" : "is-loss"}`}>
                    {event.relativeSwing >= 0 ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
                    <span>{model.userName}</span>
                    <strong>{signedPoints(event.relativeSwing)} pts</strong>
                  </div>
                  <div className={`rivals-swing ${event.relativeSwing <= 0 ? "is-gain" : "is-loss"}`}>
                    {event.relativeSwing <= 0 ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
                    <span>Nearest rival ({model.rivalName})</span>
                    <strong>{signedPoints(-event.relativeSwing)} pts</strong>
                  </div>
                  {index === 0 ? (
                    <div className="rivals-card-actions">
                      <button type="button" onClick={() => openBanter(event)}>
                        <MessageCircle aria-hidden="true" /> Banter
                      </button>
                      <button type="button" onClick={() => openExplain(event)}>
                        <CircleHelp aria-hidden="true" /> Explain
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </section>

          <section className={`rivals-contest${interaction.joinedContest ? " is-joined" : ""}`} aria-live="polite">
            <Trophy className="rivals-contest-icon" aria-hidden="true" />
            <button type="button" className="rivals-contest-copy" onClick={() => router.push("/?tab=fantasy")}>
              <strong>FC Fantasy Rivals</strong>
              <span>Mini-league · Live standings</span>
            </button>
            <button
              type="button"
              className="rivals-contest-action"
              onClick={() => dispatch({ type: "join-contest" })}
              disabled={interaction.joinedContest}
            >
              {interaction.joinedContest ? <><Check aria-hidden="true" /> Joined</> : "Join contest"}
            </button>
          </section>
        </>
      )}

      {interaction.sheet && activeEvent ? (
        <div className="rivals-sheet-backdrop" role="presentation" onClick={() => dispatch({ type: "close-sheet" })}>
          <section
            className="rivals-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rivals-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rivals-sheet-handle" aria-hidden="true" />
            <div className="rivals-sheet-header">
              <div>
                <h2 id="rivals-sheet-title">
                  {interaction.sheet === "banter" ? `Banter with ${model.rivalName}` : "Why this matters"}
                </h2>
                <p>{interaction.sheet === "banter" ? "React to this moment, not the whole match." : "A deterministic read on the live league swing."}</p>
              </div>
              <button type="button" onClick={() => dispatch({ type: "close-sheet" })} aria-label="Close">
                <X aria-hidden="true" />
              </button>
            </div>

            {interaction.sheet === "banter" ? (
              <div className="rivals-banter-sheet">
                <div className="rivals-banter-target">
                  <Crown aria-hidden="true" />
                  <span>{activeEvent.headline} moved this event {signedPoints(Math.abs(activeEvent.relativeSwing))} points between you and {model.rivalName}.</span>
                </div>
                <div className="rivals-banter-options" role="radiogroup" aria-label="Choose a suggested reply">
                  {banterOptions.map((option) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={interaction.selectedReply === option}
                      className={interaction.selectedReply === option ? "is-selected" : ""}
                      key={option}
                      onClick={() => dispatch({ type: "select-reply", reply: option })}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`rivals-primary-sheet-action${interaction.castStatus === "posted" ? " is-success" : ""}`}
                  onClick={() => void postBanter()}
                  disabled={interaction.castStatus === "posting" || interaction.castStatus === "posted"}
                >
                  {interaction.castStatus === "posting" ? <><LoaderCircle className="animate-spin" /> Posting…</> : null}
                  {interaction.castStatus === "posted" ? <><Check /> Cast sent</> : null}
                  {interaction.castStatus === "idle" || interaction.castStatus === "error" ? <><MessageCircle /> {canWrite ? "Cast banter" : "Connect to cast"}</> : null}
                </button>
                {interaction.castStatus === "error" ? <p className="rivals-sheet-error">Footy couldn’t post that cast. Try again.</p> : null}
              </div>
            ) : (
              <div className="rivals-explain-sheet">
                <div className="rivals-explain-number">{signedPoints(activeEvent.relativeSwing)}</div>
                <div>
                  <strong>{activeEvent.explanation.title}</strong>
                  <p>{activeEvent.explanation.detail}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
