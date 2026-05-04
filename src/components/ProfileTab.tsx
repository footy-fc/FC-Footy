import React from "react";
import ProfileIdentityCard from "./ProfileIdentityCard";
import ProfileCastFeed from "./ProfileCastFeed";
import { useRouter } from "next/navigation";

interface ProfileTabProps {
  viewerFid?: number;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ viewerFid }) => {
  const router = useRouter();

  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Profile</div>
      <h2 className="app-title mb-2">Identity snapshot</h2>
      <p className="app-copy mb-4">
        Fan Clubs is the place to manage your badge, countries, and alerts.
      </p>

      <ProfileIdentityCard viewerFid={viewerFid} />
      <ProfileCastFeed />

      <div className="mt-4 rounded-[22px] border border-limeGreenOpacity/20 bg-purplePanel p-4 text-lightPurple">
        <div className="text-sm">
          Manage follows from Fan Clubs so the editing flow lives in one place.
        </div>
        <button
          type="button"
          onClick={() => router.push("/?tab=fanClubs")}
          className="mt-3 rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85"
        >
          Open Fan Clubs
        </button>
      </div>
    </div>
  );
};

export default ProfileTab;
