import React, { useState } from "react";
import ContestFCFantasy from "./ContestFCFantasy";
import FavoriteTeamLeaderboard from "./ContestFavoriteTeamLeaderboard";
import ContestScoresPoints from "./ContestScoresPoints";
import ContestScoreSquare from "./ContestScoreSquare";

const Contests = () => {
  const [selectedTab, setSelectedTab] = useState<string>("fCFantasy"); // Default to FPL

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div className="mb-4">
      {/* Horizontal Scrollable Menu for Tabs */}
      <h2 className="font-2xl text-notWhite font-bold mb-4">Leaderboards</h2>        
      <div className="flex overflow-x-auto space-x-4 mb-4">
        <button
          onClick={() => handleTabSelect("fCFantasy")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "fCFantasy" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          FC FEPL
        </button>

        <button
          onClick={() => handleTabSelect("fanClubs")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "fanClubs" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          Fan Clubs
        </button>

        <button
          onClick={() => handleTabSelect("scoreSquare")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "scoreSquare" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          ScoreSquare
        </button>
       {/*  <button
          onClick={() => handleTabSelect("scoresPoints")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "scoresPoints" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          $SCORES
        </button>   
 */}
      </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-1">
        {selectedTab === "fCFantasy" && <ContestFCFantasy />}
        {selectedTab === "fanClubs" && <FavoriteTeamLeaderboard />}
        {selectedTab === "scoreSquare" && <ContestScoreSquare />}
        {selectedTab === "scoresPoints" && <ContestScoresPoints />}
      </div>
    </div>
  );
};

export default Contests;
