"use client";

import React from "react";
import { WORLD_CUP, daysUntilWorldCup, isWorldCupLive } from "~/lib/worldCup";

// ─── World Cup banner ────────────────────────────────────────────────────────
// Festive header shown at the top of Home while World Cup mode is on. Dark base
// with warm gold/green accents, a glowing gradient border, an animated sheen
// sweep, a glowing trophy and a host-nation flag row.

const WorldCupBanner: React.FC = () => {
  const live = isWorldCupLive();
  const days = daysUntilWorldCup();

  const status = live
    ? "Live now"
    : days > 0
      ? `${days} day${days === 1 ? "" : "s"} to kickoff`
      : "Kicking off soon";

  return (
    <div className="wc-banner relative overflow-hidden rounded-[24px] p-[1.5px]">
      {/* Animated gradient glow border */}
      <span className="wc-banner__border pointer-events-none absolute inset-0 rounded-[24px]" />

      <div className="wc-banner__inner relative overflow-hidden rounded-[22px] bg-[linear-gradient(125deg,rgba(245,158,11,0.16),rgba(16,185,129,0.12),rgba(18,12,36,0.97))] p-4">
        {/* Sheen sweep */}
        <span className="wc-banner__sheen pointer-events-none absolute inset-0" />
        {/* Big watermark trophy */}
        <span className="pointer-events-none absolute -right-3 -top-4 text-[88px] leading-none opacity-[0.12] select-none">
          🏆
        </span>

        <div className="relative flex items-center gap-3">
          <div className="wc-trophy flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-[26px]">
            🏆
          </div>

          <div className="min-w-0 flex-1">
            <div className="wc-title text-[11px] font-bold uppercase tracking-[0.16em]">
              {WORLD_CUP.title}
            </div>
            <div className="text-[17px] font-semibold leading-tight text-notWhite">
              {WORLD_CUP.tagline} <span className="inline-block">⚽</span>
            </div>
            <div className="mt-0.5 text-xs text-amber-200/80">{WORLD_CUP.subtitle}</div>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 self-start rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold text-amber-200 whitespace-nowrap">
            {live ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> : null}
            {status}
          </span>
        </div>

        {/* Host-nation flag row */}
        <div className="relative mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1 text-lg">
            {WORLD_CUP.hostFlags.map((f, i) => (
              <span key={i} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {f}
              </span>
            ))}
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-200/70">
            Host nations
          </span>
          <div className="ml-auto flex items-center gap-0.5 overflow-hidden text-sm opacity-70">
            {WORLD_CUP.flagConfetti.slice(0, 7).map((f, i) => (
              <span key={i}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .wc-banner__border {
          background: linear-gradient(
            120deg,
            rgba(245, 158, 11, 0.7),
            rgba(16, 185, 129, 0.6),
            rgba(189, 25, 93, 0.55),
            rgba(245, 158, 11, 0.7)
          );
          background-size: 300% 300%;
          animation: wc-border-pan 8s ease infinite;
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          padding: 1.5px;
        }
        .wc-banner__sheen {
          background: linear-gradient(
            105deg,
            transparent 30%,
            rgba(255, 255, 255, 0.12) 48%,
            transparent 66%
          );
          transform: translateX(-100%);
          animation: wc-sheen 5.5s ease-in-out infinite;
        }
        .wc-title {
          background: linear-gradient(90deg, #fcd34d, #fde68a, #34d399);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .wc-trophy {
          box-shadow: 0 0 18px rgba(245, 158, 11, 0.35);
          animation: wc-glow 3s ease-in-out infinite;
        }
        @keyframes wc-border-pan {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes wc-sheen {
          0%, 18% { transform: translateX(-100%); }
          55%, 100% { transform: translateX(100%); }
        }
        @keyframes wc-glow {
          0%, 100% { box-shadow: 0 0 14px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 24px rgba(245, 158, 11, 0.55); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wc-banner__border,
          .wc-banner__sheen,
          .wc-trophy {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default WorldCupBanner;
