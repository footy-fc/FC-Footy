import React from "react";
import { useSearchParams } from "next/navigation";
import ForYouProfile from "./ForYouProfile";
import ForYouTeamsFans from "./ForYouTeamsFans";

const FanClubsTab: React.FC = () => {
  const searchParams = useSearchParams();
  const profileFid = searchParams?.get("profileFid");
  const castHash = searchParams?.get("castHash") || undefined;

  return (
    <div className="mb-4">
      <h2 className="font-2xl text-notWhite font-bold mb-2">Fan Clubs</h2>
      <p className="text-sm text-lightPurple mb-4">
        Set your favorite club, follow others for alerts, and discover fans who back the same badge.
      </p>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        {profileFid ? (
          <ForYouProfile profileFid={Number(profileFid)} castHash={castHash} />
        ) : (
          <ForYouTeamsFans />
        )}
      </div>
    </div>
  );
};

export default FanClubsTab;
