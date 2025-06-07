import React, { useState } from "react";
import OgRewards from "./OgRewards";

const Rewards = () => {
  const [selectedTab, setSelectedTab] = useState<string>("ogRewards");

  return (
    <div className="mb-4">
      {/* Horizontal Scrollable Menu for Tabs */}
      <h2 className="font-2xl text-notWhite font-bold mb-4">Rewards</h2>
      <div className="flex overflow-x-auto space-x-4 mb-4">
        <button
          onClick={() => setSelectedTab("feplWeekly")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "feplWeekly"
              ? "border-limeGreenOpacity text-lightPurple"
              : "border-gray-500 text-gray-500"
          }`}
        >
          FEPL Weekly Rewards
        </button>
        <button
          onClick={() => setSelectedTab("ogRewards")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "ogRewards"
              ? "border-limeGreenOpacity text-lightPurple"
              : "border-gray-500 text-gray-500"
          }`}
        >
          OG Rewards
        </button>
      </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        {selectedTab === "feplWeekly" && (
          <div className="text-center p-4">
            <h3 className="text-lg text-notWhite font-semibold">
              FEPL Weekly Rewards - Coming Soon!
            </h3>
            <p className="text-sm text-lightPurple mt-2">
              Stay tuned for exciting weekly rewards in the Fantasy English Premier League!
            </p>
          </div>
        )}
        {selectedTab === "ogRewards" && (
          <div>
            <OgRewards />
            
          </div>
        )}
      </div>
    </div>
  );
};

export default Rewards;