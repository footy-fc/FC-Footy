import React from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import ForYouProfile from "./ForYouProfile";
import ForYouTeamsFans from "./ForYouTeamsFans";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

interface FanClubsTabProps {
  viewerFid?: number;
}

const FanClubsTab: React.FC<FanClubsTabProps> = ({ viewerFid }) => {
  const searchParams = useSearchParams();
  const profileFid = searchParams?.get("profileFid");
  const teamId = searchParams?.get("teamId");
  const { ready, authenticated } = usePrivy();
  const { hasFarcaster, requestSigner } = useFootyFarcaster();

  if (ready && authenticated && !hasFarcaster) {
    return (
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Fan Clubs</div>
        <h2 className="app-title mb-2">Find fellow fans</h2>
        <p className="app-copy mb-4">
          Footy requires a Farcaster ID to favorite clubs, follow countries, and receive match alerts.
        </p>

        <div className="rounded-[22px] border border-deepPink/30 bg-purplePanel p-4 text-lightPurple">
          <button
            type="button"
            onClick={() => void requestSigner()}
            className="rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85"
          >
            Connect Farcaster
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Fan Clubs</div>
      <h2 className="app-title mb-2">Build your football graph</h2>
      <p className="app-copy mb-4">
        Set your favorite club, follow others for alerts, and discover fans who back the same badge.
      </p>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        {profileFid ? (
          <ForYouProfile profileFid={Number(profileFid)} viewerFid={viewerFid} />
        ) : (
          <ForYouTeamsFans viewerFid={viewerFid} initialSelectedTeam={teamId || undefined} />
        )}
      </div>
    </div>
  );
};

export default FanClubsTab;
