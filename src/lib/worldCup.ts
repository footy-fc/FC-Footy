import { WORLD_CUP_MODE } from "./config";

// ─── World Cup configuration ─────────────────────────────────────────────────
// Single source of truth for the festive World Cup experience. To return the
// app to its default look once the tournament is over, set WORLD_CUP_MODE to
// `false` in src/lib/config.ts — everything below is gated on `isWorldCupMode()`.

export const WORLD_CUP = {
  /** ESPN soccer league slug used for fixtures/scoreboard. */
  league: "fifa.world",
  /** Display copy. */
  title: "World Cup 2026",
  subtitle: "USA · Canada · Mexico",
  tagline: "The world is watching",
  /** Host nation flag emojis, plus a few extras for festive flair. */
  hostFlags: ["🇺🇸", "🇨🇦", "🇲🇽"],
  flagConfetti: ["🇧🇷", "🇦🇷", "🇫🇷", "🇩🇪", "🇪🇸", "🇵🇹", "🇬🇧", "🇳🇱", "🇯🇵", "🇲🇽"],
  /** Tournament window (used for soft messaging only, not as the master switch). */
  startsAt: "2026-06-11T00:00:00Z",
  endsAt: "2026-07-19T23:59:59Z",
  /** Festive accent classes layered on top of the dark base theme. */
  theme: {
    // Warm gold → green festive gradient for banners/headers.
    bannerGradient:
      "bg-[linear-gradient(120deg,rgba(245,158,11,0.22),rgba(16,185,129,0.16),rgba(18,12,36,0.96))]",
    bannerBorder: "border-amber-400/40",
    accentText: "text-amber-300",
    accentSoft: "text-amber-200/80",
    chipBg: "bg-amber-400/15",
    chipBorder: "border-amber-400/30",
    sectionGradient:
      "bg-[linear-gradient(160deg,rgba(16,185,129,0.10),rgba(18,12,36,0.6))]",
    sectionBorder: "border-emerald-400/25",
  },
} as const;

/** Whether the festive World Cup experience should be shown. */
export function isWorldCupMode(): boolean {
  return WORLD_CUP_MODE;
}

/** True if today falls within the configured tournament window. */
export function isWorldCupLive(now: Date = new Date()): boolean {
  const start = new Date(WORLD_CUP.startsAt).getTime();
  const end = new Date(WORLD_CUP.endsAt).getTime();
  const t = now.getTime();
  return t >= start && t <= end;
}

/** Whole days until kickoff (0 once the tournament has started). */
export function daysUntilWorldCup(now: Date = new Date()): number {
  const start = new Date(WORLD_CUP.startsAt).getTime();
  const diff = start - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
