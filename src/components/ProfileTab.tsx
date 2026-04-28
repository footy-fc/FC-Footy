import React from "react";
import SettingsFollowClubs from "./SettingsFollowClubs";

interface ProfileTabProps {
  viewerFid?: number;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ viewerFid }) => {
  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Profile</div>
      <h2 className="app-title mb-2">Personalize with your favs</h2>
      <p className="app-copy mb-4">
        Pick clubs and countries and turn on notifications.
      </p>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        <SettingsFollowClubs viewerFid={viewerFid} />
      </div>
    </div>
  );
};

export default ProfileTab;
