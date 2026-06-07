import React from "react";
import ForYouWhosPlaying from "./ForYouWhosPlaying";
import WorldCupBanner from "./worldcup/WorldCupBanner";
import WorldCupSection from "./worldcup/WorldCupSection";
import { getTeamPreferences } from "../lib/kvPerferences";
import { useWorldCupMode } from "../lib/useWorldCupMode";
import { sdk } from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface HomeTabProps {
  onNavigate: (tab: string) => void;
  viewerFid?: number;
}

// ─── Main component ────────────────────────────────────────────────────────────

const HomeTab: React.FC<HomeTabProps> = ({ onNavigate, viewerFid }) => {
  const [hasChosenTeams, setHasChosenTeams] = React.useState(false);
  const { ready, authenticated } = usePrivy();
  const { hasFarcaster, runtime } = useFootyFarcaster();
  const worldCup = useWorldCupMode();

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
        if (!fid) return;

        const preferences = await getTeamPreferences(fid);
        if (!cancelled) {
          setHasChosenTeams(Boolean(preferences && preferences.length > 0));
        }
      } catch (error) {
        console.warn("HomeTab preference bootstrap skipped:", error);
        if (!cancelled) {
          setHasChosenTeams(false);
        }
      }
    };

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [viewerFid]);

  return (
    <div className="mb-4">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="app-eyebrow mb-1">Home</div>
        <div className="flex items-end justify-between gap-3">
          <h2 className="app-title">Footy App</h2>
          <button
            onClick={() => onNavigate("fanClubs")}
            title="Follow teams to personalise Home"
            aria-label="Follow teams"
            className="shrink-0 self-end px-3 py-1 text-xs rounded text-lightPurple hover:bg-deepPink hover:text-white transition-colors"
          >
            Follow teams 🔔
          </button>
        </div>
      </div>

      {/* ── Profile completion nudge (browser mode only) ─────────────────────── */}
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

      <div className="flex flex-col gap-4">
        {/* ── World Cup (festive) ─────────────────────────────────────────────── */}
        {worldCup && (
          <>
            <WorldCupBanner />
            <WorldCupSection />
          </>
        )}

        {/* ── Onboarding quicklinks – shown until user follows teams ──────────── */}
        {!hasChosenTeams && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onNavigate("fanClubs")}
              className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
            >
              <div className="app-card-title mb-1">Fan Clubs</div>
              <div className="app-micro">Pick favorites and see fellow fans.</div>
            </button>
            <button
              onClick={() => onNavigate("fantasy")}
              className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
            >
              <div className="app-card-title mb-1">Fantasy</div>
              <div className="app-micro">Farcaster FEPL standings and profiles.</div>
            </button>
            <button
              onClick={() => onNavigate("tools")}
              className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
            >
              <div className="app-card-title mb-1">Tools</div>
              <div className="app-micro">Value charts and weekly decisions.</div>
            </button>
          </div>
        )}

        {/* ── Matches for followed clubs ──────────────────────────────────────── */}
        {/* When World Cup mode is on, the WC section fills the space, so club
            matches stay quiet unless there are fixtures (suppressAffordances).
            Otherwise show the no-matches CTA so Home is never blank. */}
        <ForYouWhosPlaying
          suppressFtue={false}
          suppressAffordances={worldCup}
          viewerFid={viewerFid}
          sectionTitle="Your Club Matches"
        />
      </div>
    </div>
  );
};

export default HomeTab;
