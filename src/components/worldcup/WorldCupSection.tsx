"use client";

import React from "react";
import Image from "next/image";
import { WORLD_CUP, daysUntilWorldCup, isWorldCupLive } from "~/lib/worldCup";

// ─── Types (subset of ESPN scoreboard shape we rely on) ──────────────────────

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  winner?: boolean;
  team?: {
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logo?: string;
  };
}

interface EspnEvent {
  id?: string;
  date?: string;
  shortName?: string;
  status?: {
    type?: { state?: string; shortDetail?: string; completed?: boolean };
  };
  competitions?: { competitors?: EspnCompetitor[] }[];
}

interface Fixture {
  id: string;
  date?: string;
  state: string;
  detail: string;
  home: EspnCompetitor | undefined;
  away: EspnCompetitor | undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEvents(events: EspnEvent[]): Fixture[] {
  return events.map((e, i) => {
    const comps = e.competitions?.[0]?.competitors ?? [];
    return {
      id: e.id ?? `${e.shortName ?? "wc"}-${i}`,
      date: e.date,
      state: e.status?.type?.state ?? "pre",
      detail: e.status?.type?.shortDetail ?? "",
      home: comps.find((c) => c.homeAway === "home") ?? comps[0],
      away: comps.find((c) => c.homeAway === "away") ?? comps[1],
    };
  });
}

function formatKickoff(date?: string): string {
  if (!date) return "TBD";
  try {
    return new Date(date).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "TBD";
  }
}

// ─── Team row ────────────────────────────────────────────────────────────────

function TeamLine({
  c,
  score,
  showScore,
  loser,
}: {
  c?: EspnCompetitor;
  score?: string;
  showScore?: boolean;
  loser?: boolean;
}) {
  const name = c?.team?.shortDisplayName || c?.team?.displayName || c?.team?.abbreviation || "TBD";
  return (
    <div className="flex items-center gap-2.5">
      {c?.team?.logo ? (
        <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 bg-white/5">
          <Image src={c.team.logo} alt={name} width={22} height={22} />
        </span>
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[11px]">⚽</span>
      )}
      <span
        className={`truncate text-sm font-medium ${loser ? "text-lightPurple/60" : "text-notWhite"}`}
      >
        {name}
      </span>
      {showScore ? (
        <span
          className={`ml-auto flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-sm font-bold tabular-nums ${
            loser ? "bg-white/5 text-lightPurple/70" : "bg-amber-400/15 text-amber-200"
          }`}
        >
          {score ?? "0"}
        </span>
      ) : null}
    </div>
  );
}

// ─── Main section ────────────────────────────────────────────────────────────

const WorldCupSection: React.FC = () => {
  const [fixtures, setFixtures] = React.useState<Fixture[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${WORLD_CUP.league}/scoreboard`
      );
      if (!res.ok) throw new Error(`Scoreboard request failed (${res.status})`);
      const json: unknown = await res.json();
      const events: EspnEvent[] =
        json && typeof json === "object" && Array.isArray((json as Record<string, unknown>).events)
          ? ((json as Record<string, unknown>).events as EspnEvent[])
          : [];
      const order: Record<string, number> = { in: 0, pre: 1, post: 2 };
      const parsed = parseEvents(events).sort(
        (a, b) => (order[a.state] ?? 3) - (order[b.state] ?? 3)
      );
      setFixtures(parsed.slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load fixtures");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const live = isWorldCupLive();
  const days = daysUntilWorldCup();

  return (
    <div className="wc-section relative overflow-hidden rounded-[22px] border border-emerald-400/25 bg-[linear-gradient(160deg,rgba(16,185,129,0.10),rgba(18,12,36,0.55))] p-3">
      {/* Pitch-stripe texture */}
      <span className="wc-section__pitch pointer-events-none absolute inset-0 opacity-[0.05]" />

      <div className="relative mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <span className="text-sm font-bold text-notWhite">World Cup fixtures</span>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1 rounded-full border border-amber-400/30 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition-colors hover:bg-amber-400/10 disabled:opacity-40"
        >
          <svg
            className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="relative flex items-center justify-center gap-2 py-8 text-lightPurple/60">
          <Image src="/defifa_spinner.gif" alt="Loading" width={28} height={28} />
          <span className="text-xs">Loading World Cup…</span>
        </div>
      )}

      {/* Empty / pre-tournament / error → festive fallback */}
      {!loading && (error || fixtures.length === 0) && (
        <div className="relative overflow-hidden rounded-[18px] border border-dashed border-amber-400/30 bg-darkPurple/40 p-6 text-center">
          <div className="mb-2 text-4xl">🌍⚽🏆</div>
          <div className="wc-count text-lg font-bold">
            {days > 0 ? `${days} day${days === 1 ? "" : "s"} to kickoff` : "World Cup is here"}
          </div>
          <p className="mt-1 text-xs text-lightPurple/70">
            {error
              ? "Fixtures will appear here once they’re live."
              : "No fixtures scheduled right now — check back on matchday."}
          </p>
          <div className="mt-3 text-lg tracking-widest opacity-80">
            {WORLD_CUP.flagConfetti.slice(0, 8).map((f, i) => (
              <span key={i}>{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Fixtures */}
      {!loading && !error && fixtures.length > 0 && (
        <div className="relative flex flex-col gap-2.5">
          {fixtures.map((f) => {
            const isLive = f.state === "in";
            const isFinal = f.state === "post";
            const showScore = isLive || isFinal;
            const homeLost = isFinal && f.away?.winner === true;
            const awayLost = isFinal && f.home?.winner === true;
            return (
              <div
                key={f.id}
                className={`group relative overflow-hidden rounded-[18px] border bg-darkPurple/55 p-3 pl-4 transition-transform hover:-translate-y-0.5 ${
                  isLive
                    ? "border-emerald-400/40 shadow-[0_0_18px_rgba(16,185,129,0.18)]"
                    : "border-limeGreenOpacity/15"
                }`}
              >
                {/* Left accent bar */}
                <span
                  className={`absolute left-0 top-0 h-full w-1 ${
                    isLive
                      ? "bg-gradient-to-b from-emerald-400 to-amber-400"
                      : "bg-gradient-to-b from-amber-400/70 to-emerald-400/50"
                  }`}
                />

                {/* Meta row */}
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      isLive
                        ? "bg-emerald-400/15 text-emerald-300"
                        : isFinal
                          ? "bg-white/5 text-lightPurple/70"
                          : "bg-amber-400/12 text-amber-200/90"
                    }`}
                  >
                    {isLive ? (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    ) : null}
                    {isLive ? "Live" : isFinal ? "Full time" : formatKickoff(f.date)}
                  </span>
                  {f.detail ? (
                    <span className="text-[10px] text-lightPurple/45">{f.detail}</span>
                  ) : null}
                </div>

                {/* Teams */}
                <div className="flex flex-col gap-1.5">
                  <TeamLine c={f.home} score={f.home?.score} showScore={showScore} loser={homeLost} />
                  <TeamLine c={f.away} score={f.away?.score} showScore={showScore} loser={awayLost} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && (live || days === 0) && fixtures.length > 0 ? (
        <p className="relative mt-2.5 text-center text-[11px] text-amber-200/70">
          {WORLD_CUP.subtitle} · {WORLD_CUP.hostFlags.join(" ")}
        </p>
      ) : null}

      <style jsx>{`
        .wc-section__pitch {
          background-image: repeating-linear-gradient(
            90deg,
            rgba(16, 185, 129, 0.6) 0px,
            rgba(16, 185, 129, 0.6) 2px,
            transparent 2px,
            transparent 38px
          );
        }
        .wc-count {
          background: linear-gradient(90deg, #fcd34d, #fde68a, #34d399);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>
    </div>
  );
};

export default WorldCupSection;
