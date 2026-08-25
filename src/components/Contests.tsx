import React, { useState } from "react";
import ContestFCFantasy from "./ContestFCFantasy";
import FavoriteTeamLeaderboard from "./ContestFavoriteTeamLeaderboard";
import ContestScoresPoints from "./ContestScoresPoints";
import FPLAnalytics from "./FPLAnalytics";
import TokenGatedContent from "./TokenGatedContent";
// import ContestScoreSquare from "./ContestScoreSquare"; // Temporarily disabled

const Contests = () => {
  const [selectedTab, setSelectedTab] = useState<string>("fCFantasy"); // Default to FEPL leaderboard

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h2 className="font-2xl text-notWhite font-bold">Standings and Analytics</h2>
      </div>
      {/* Horizontal Scrollable Menu for Tabs */}
      <div className="flex overflow-x-auto space-x-4 mb-4">
        <button
          onClick={() => handleTabSelect("fCFantasy")}
          className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
            selectedTab === "fCFantasy" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
          }`}
        >
          FC FEPL
        </button>

        <button
          onClick={() => handleTabSelect("fanClubs")}
          className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
            selectedTab === "fanClubs" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
          }`}
        >
          Fan Clubs
        </button>

        <button
          onClick={() => handleTabSelect("fcFeplAnalytics")}
          className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 flex items-center gap-1 ${
            selectedTab === "fcFeplAnalytics" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
          }`}
        >
          <span>🔒</span>
          Analytics
        </button>

        {/* <button
          onClick={() => handleTabSelect("scoreSquare")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "scoreSquare" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          ScoreSquare
        </button> */}
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
        {selectedTab === "fcFeplAnalytics" && (
          <TokenGatedContent>
            <FPLAnalytics />
          </TokenGatedContent>
        )}
        {/* {selectedTab === "scoreSquare" && <ContestScoreSquare />} */}
        {selectedTab === "scoresPoints" && <ContestScoresPoints />}
      </div>
    </div>
  );
};

export default Contests;
