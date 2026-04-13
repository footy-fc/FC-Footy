import React from "react";
import SettingsFollowClubs from "./SettingsFollowClubs";

const ProfileTab: React.FC = () => {
  return (
    <div className="mb-4">
      <h2 className="font-2xl text-notWhite font-bold mb-2">Profile</h2>
      <p className="text-sm text-lightPurple mb-4">
        Your football identity in Footy. Pick a favorite club, manage who you follow, and control score alerts.
      </p>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        <SettingsFollowClubs />
      </div>
    </div>
  );
};

export default ProfileTab;
