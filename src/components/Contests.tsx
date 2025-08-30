import React, { useEffect, useState } from "react";
import ContestFCFantasy from "./ContestFCFantasy";
import FavoriteTeamLeaderboard from "./ContestFavoriteTeamLeaderboard";
import ContestScoresPoints from "./ContestScoresPoints";
import FPLAnalytics from "./FPLAnalytics";
import TokenGatedContent from "./TokenGatedContent";
import { sdk } from "@farcaster/miniapp-sdk";
// import ContestScoreSquare from "./ContestScoreSquare"; // Temporarily disabled

const Contests = () => {
  const [selectedTab, setSelectedTab] = useState<string>("fCFantasy"); // Default to FEPL leaderboard

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };

  // FEPL support chat invite (elevated affordance)
  const [feplInvite, setFeplInvite] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/fanclub-chat?teamId=fepl');
        if (!cancelled) {
          if (res.ok) {
            const j = await res.json();
            setFeplInvite(j?.inviteLinkUrl || null);
          } else {
            setFeplInvite(null);
          }
        }
      } catch {
        if (!cancelled) setFeplInvite(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mb-4">
      {/* Header row with support affordance */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-2xl text-notWhite font-bold">Leaderboards</h2>
        {feplInvite && (
          <button
            title="Need help? Ask other managers in the league chat"
            aria-label="Open league support chat"
            className="px-3 py-1 text-xs rounded text-lightPurple hover:bg-deepPink hover:text-white transition-colors"
            onClick={async () => {
              try {
                await sdk.actions.ready();
                if (feplInvite) await sdk.actions.openUrl(feplInvite);
              } catch {}
            }}
          >
            ❓ Need help? Ask in chat
          </button>
        )}
      </div>
      {/* Horizontal Scrollable Menu for Tabs */}
      <div className="flex overflow-x-auto space-x-4 mb-4">
        <button
          onClick={() => handleTabSelect("fCFantasy")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "fCFantasy" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          FEPL
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
          onClick={() => handleTabSelect("fcFeplAnalytics")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 flex items-center gap-1 ${
            selectedTab === "fcFeplAnalytics" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
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
