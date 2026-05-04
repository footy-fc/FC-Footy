import React from "react";
import ForYouWhosPlaying from "./ForYouWhosPlaying";
import { getTeamPreferences } from "../lib/kvPerferences";
import { sdk } from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

interface HomeTabProps {
  onNavigate: (tab: string) => void;
  viewerFid?: number;
}

const HomeTab: React.FC<HomeTabProps> = ({ onNavigate, viewerFid }) => {
  const [hasChosenTeams, setHasChosenTeams] = React.useState(false);
  const { ready, authenticated } = usePrivy();
  const { hasLinkedFarcaster, advanceOnboarding, onboardingState, runtime } = useFootyFarcaster();

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
        console.warn('HomeTab preference bootstrap skipped:', error);
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
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Home</div>
        <div className="flex items-end justify-between gap-3">
          <h2 className="app-title">Footy App adapts to you</h2>
          <button
            onClick={() => onNavigate("fanClubs")}
            title="Follow teams to personalize Home"
            aria-label="Follow teams"
            className="shrink-0 self-end px-3 py-1 text-xs rounded text-lightPurple hover:bg-deepPink hover:text-white transition-colors"
          >
            Follow teams 🔔
          </button>
        </div>
      </div>

      {ready && authenticated && runtime !== "miniapp" && !hasLinkedFarcaster ? (
        <div className="mb-4 rounded-[22px] border border-deepPink/30 bg-purplePanel p-4 text-lightPurple">
          <div className="app-card-title mb-2">Personalize your fan experience</div>
          <button
            type="button"
            onClick={() => void advanceOnboarding()}
            className="rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85"
          >
            {onboardingState === "needs_email"
              ? "Add email"
              : onboardingState === "needs_wallet"
                ? "Create wallet"
                : "Connect Farcaster"}
          </button>
        </div>
      ) : null}

      {!hasChosenTeams && (
        <div className="grid grid-cols-3 gap-2 mb-4">
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
      <ForYouWhosPlaying
        suppressFtue={false}
        suppressAffordances={true}
        viewerFid={viewerFid}
        sectionTitle="Your Club Matches"
      />
    </div>
  );
};

export default HomeTab;
