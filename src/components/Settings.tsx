import React, { useState } from "react";
import SettingsfollowClubs from "./SettingsFollowClubs";
// Admin sections moved to AdminDashboard; keep Settings for user preferences only
//import SettingsPFPClubs from "./SettingsPFPClubs";

const Settings = () => {
  const [selectedTab, setSelectedTab] = useState<string>("followClubs");

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div className="mb-4">
      {/* Horizontal Scrollable Menu for Tabs */}
      <h2 className="font-2xl text-notWhite font-bold mb-4">Preferences</h2>
      <div className="flex overflow-x-auto space-x-4 mb-4">
        <button
          onClick={() => handleTabSelect("followClubs")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "followClubs" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          Follow Teams
        </button>
      </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2">
        {selectedTab === "followClubs" && <SettingsfollowClubs />}
      </div>
    </div>
  );
};

export default Settings;
