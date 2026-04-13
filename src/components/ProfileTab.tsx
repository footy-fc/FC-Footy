import React from "react";
import SettingsFollowClubs from "./SettingsFollowClubs";

const ProfileTab: React.FC = () => {
  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Profile</div>
      <h2 className="app-title mb-2">Favorites and alerts</h2>
      <p className="app-copy mb-4">
        Your football identity in Footy. Pick a favorite club, manage who you follow, and control score alerts.
      </p>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        <SettingsFollowClubs />
      </div>
    </div>
  );
};

export default ProfileTab;
