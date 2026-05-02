import React from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import ForYouProfile from "./ForYouProfile";
import ForYouTeamsFans from "./ForYouTeamsFans";
import { FanClubInviteExperience } from "./fanclubs/FanClubInviteExperience";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

interface FanClubsTabProps {
  viewerFid?: number;
}

const FanClubsTab: React.FC<FanClubsTabProps> = ({ viewerFid }) => {
  const searchParams = useSearchParams();
  const profileFid = searchParams?.get("profileFid");
  const teamId = searchParams?.get("teamId");
  const shareContext = searchParams?.get("shareContext");
  const castHash = searchParams?.get("castHash");
  const inviteUsername = searchParams?.get("inviteUsername");
  const { ready, authenticated } = usePrivy();
  const { hasLinkedFarcaster, advanceOnboarding, onboardingState, runtime } = useFootyFarcaster();

  if (ready && authenticated && runtime !== "miniapp" && !hasLinkedFarcaster) {
    return (
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Fan Clubs</div>
        <h2 className="app-title mb-2">Find fellow fans</h2>
        <p className="app-copy mb-4">
          Footy requires a Farcaster ID to pick your club badge, follow countries, and receive match alerts.
        </p>

        <div className="rounded-[22px] border border-deepPink/30 bg-purplePanel p-4 text-lightPurple">
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
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Fan Clubs</div>
      <h2 className="app-title mb-2">Wear your badge</h2>
      <p className="app-copy mb-4">
        Pick one club as your identity, follow more for alerts, and discover the fans who wear the same badge.
      </p>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        {profileFid && shareContext === "invite" ? (
          <FanClubInviteExperience
            profileFid={Number(profileFid)}
            viewerFid={viewerFid}
            castHash={castHash || undefined}
            inviteUsername={inviteUsername || undefined}
          />
        ) : profileFid ? (
          <ForYouProfile profileFid={Number(profileFid)} viewerFid={viewerFid} />
        ) : (
          <ForYouTeamsFans viewerFid={viewerFid} initialSelectedTeam={teamId || undefined} />
        )}
      </div>
    </div>
  );
};

export default FanClubsTab;
