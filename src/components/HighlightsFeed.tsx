"use client";

import React, { useEffect, useState } from "react";
import type { MatchHighlight } from "~/app/api/highlights/route";
import Image from "next/image";

// ── Skeleton Card ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="shrink-0 w-[340px] rounded-[22px] border border-limeGreenOpacity/10 bg-purplePanel p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-20 bg-white/10 rounded-full" />
        <div className="h-3 w-10 bg-white/10 rounded-full" />
      </div>
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-white/10" />
          <div className="h-3 w-8 bg-white/10 rounded-full" />
        </div>
        <div className="h-10 w-16 bg-white/10 rounded-lg" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-white/10" />
          <div className="h-3 w-8 bg-white/10 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-white/10 rounded-full" />
        <div className="h-3 w-5/6 bg-white/10 rounded-full" />
      </div>
    </div>
  );
}

// ── Event Pill ───────────────────────────────────────────────────
function EventPill({ type, player, time }: { type: string; player: string; time: string }) {
  const icon = (() => {
    if (type.toLowerCase().includes("goal") || type.toLowerCase().includes("penalty - scored")) return "⚽";
    if (type.toLowerCase().includes("red")) return "🟥";
    if (type.toLowerCase().includes("yellow")) return "🟨";
    if (type.toLowerCase().includes("own")) return "😬";
    if (type.toLowerCase().includes("missed")) return "❌";
    return "⚡";
  })();

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-lightPurple whitespace-nowrap">
      {icon} {player} {time}&apos;
    </span>
  );
}

// ── Match Highlight Card ─────────────────────────────────────────
function HighlightCard({ match }: { match: MatchHighlight }) {
  const goals = match.keyEvents.filter(
    (e) =>
      e.type.toLowerCase().includes("goal") ||
      e.type.toLowerCase().includes("penalty - scored")
  );
  const drama = match.keyEvents.filter(
    (e) =>
      e.type.toLowerCase().includes("red") ||
      e.type.toLowerCase().includes("missed") ||
      e.type.toLowerCase().includes("own")
  );
  const topEvents = [...goals, ...drama].slice(0, 5);

  return (
    <div className="shrink-0 w-[340px] rounded-[22px] border border-limeGreenOpacity/15 bg-gradient-to-b from-purplePanel to-darkPurple/90 p-4 flex flex-col gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      {/* League */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {match.leagueLogo ? (
            <Image
              src={match.leagueLogo}
              alt={match.leagueName}
              width={16}
              height={16}
              className="object-contain opacity-80"
            />
          ) : null}
          <span className="text-[10px] font-bold tracking-widest text-lightPurple uppercase">
            {match.leagueName}
          </span>
        </div>
        <span className="text-[10px] font-bold text-accentPink uppercase tracking-wider">
          FT
        </span>
      </div>

      {/* Scoreline */}
      <div className="flex items-center justify-center gap-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          {match.homeLogo ? (
            <Image
              src={match.homeLogo}
              alt={match.homeTeam}
              width={44}
              height={44}
              className="object-contain"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-deepPink/20 flex items-center justify-center text-xs font-bold text-notWhite">
              {match.homeTeam.substring(0, 3)}
            </div>
          )}
          <span className="text-[11px] font-bold text-lightPurple">{match.homeTeam}</span>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center">
          <span className="text-4xl font-black text-notWhite tracking-tight leading-none">
            {match.homeScore}
            <span className="text-lightPurple/50 mx-1 text-2xl">–</span>
            {match.awayScore}
          </span>
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          {match.awayLogo ? (
            <Image
              src={match.awayLogo}
              alt={match.awayTeam}
              width={44}
              height={44}
              className="object-contain"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-deepPink/20 flex items-center justify-center text-xs font-bold text-notWhite">
              {match.awayTeam.substring(0, 3)}
            </div>
          )}
          <span className="text-[11px] font-bold text-lightPurple">{match.awayTeam}</span>
        </div>
      </div>

      {/* Key events */}
      {topEvents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topEvents.map((e, i) => (
            <EventPill key={i} type={e.type} player={e.player} time={e.time} />
          ))}
        </div>
      )}

      {/* AI Summary */}
      <div className="relative">
        <div className="absolute -left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-deepPink to-deepPink/0 rounded-full" />
        <p className="pl-3 text-[12px] leading-[1.6] text-lightPurple/90 italic">
          {match.summary}
        </p>
        <div className="mt-1.5 pl-3 flex items-center gap-1">
          <span className="text-[9px] font-bold tracking-widest text-deepPink/60 uppercase">
            ⚡ AI Recap
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Feed Component ──────────────────────────────────────────
export default function HighlightsFeed() {
  const [highlights, setHighlights] = useState<MatchHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch("/api/highlights");
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as MatchHighlight[];
        if (!cancelled) setHighlights(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex">
          <span className="w-2 h-2 rounded-full bg-limeGreen animate-ping absolute" />
          <span className="w-2 h-2 rounded-full bg-limeGreen" />
        </div>
        <span className="text-[11px] font-black tracking-[0.18em] text-limeGreen uppercase">
          AI Highlights
        </span>
        <span className="text-[10px] text-lightPurple/50 ml-auto">
          Top games · AI recap
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {[0, 1, 2].map((i) => (
            <div key={i} className="snap-start">
              <SkeletonCard />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-[18px] border border-fontRed/20 bg-purplePanel p-4 text-sm text-lightPurple/70 text-center">
          Could not load highlights right now. Check back soon.
        </div>
      )}

      {/* Empty */}
      {!loading && !error && highlights.length === 0 && (
        <div className="rounded-[18px] border border-limeGreenOpacity/10 bg-purplePanel p-4 text-sm text-lightPurple/70 text-center">
          No completed matches yet today — highlights will appear after full-time.
        </div>
      )}

      {/* Cards */}
      {!loading && !error && highlights.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {highlights.map((match) => (
            <div key={match.id} className="snap-start">
              <HighlightCard match={match} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
