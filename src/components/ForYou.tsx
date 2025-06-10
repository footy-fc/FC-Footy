import React, { useState, useEffect } from "react";
import ForYouTeamsFans from "./ForYouTeamsFans";
import ForYouWhosPlaying from "./ForYouWhosPlaying";
import ForYouProfile from "./ForYouProfile";
import BuyPoints from "./BuyPoints";
import { usePrivy } from "@privy-io/react-auth";
import { getTeamPreferences } from "../lib/kvPerferences";

const ForYou = () => {
  const { user } = usePrivy();
  const [selectedTab, setSelectedTab] = useState<string>("matches");
  const [showLiveChat, setShowLiveChat] = useState(false);

  useEffect(() => {
    const checkPreferences = async () => {
      const fid = user?.linkedAccounts.find((a) => a.type === "farcaster")?.fid;
      if (fid) {
        const prefs = await getTeamPreferences(fid);
        if (!prefs || prefs.length === 0) {
          setSelectedTab("fellowFollowers");
        }
      }
    };
    checkPreferences();
  }, [user]);

  return (
    <div className="mb-4">
      {/* Horizontal Scrollable Menu for Tabs */}
      <h2 className="font-2xl text-notWhite font-bold mb-4">Fan Experience</h2>        
      <div className="flex overflow-x-auto space-x-4 mb-4">
        {/* Conditional if there are fav teams being followed */}
        {showLiveChat ? (
            <button
            onClick={() => setShowLiveChat(false)}
            className="flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 border-limeGreenOpacity text-lightPurple"
            >
            ← Back
            </button>
        ) : (
            <>
            <button
              onClick={() => setSelectedTab("buyPoints")}
              className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
                selectedTab === "buyPoints"
                  ? "border-limeGreenOpacity text-lightPurple"
                  : "border-gray-500 text-gray-500"
              }`}
            >
              Buy $SCORES
            </button>
            <button
              onClick={() => setSelectedTab("matches")}
              className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
                selectedTab === "matches"
                  ? "border-limeGreenOpacity text-lightPurple"
                  : "border-gray-500 text-gray-500"
              }`}
            >
              Who&apos;s Playing
            </button>
            <button
            onClick={() => setSelectedTab("fellowFollowers")}
            className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
                selectedTab === "fellowFollowers"
                ? "border-limeGreenOpacity text-lightPurple"
                : "border-gray-500 text-gray-500"
            }`}
            >
            Teams & Fans
            </button>
             <button
            onClick={() => setSelectedTab("forYouProfile")}
            className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
                selectedTab === "forYouProfile"
                ? "border-limeGreenOpacity text-lightPurple"
                : "border-gray-500 text-gray-500"
            }`}
            >
            Profile
            </button>
            </>
        )}
        </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">        
      {selectedTab === "fellowFollowers" && (
        <>
          <ForYouTeamsFans
              showLiveChat={showLiveChat}
              setShowLiveChat={setShowLiveChat}
          />
        </>
      )}
      {selectedTab === "matches" && (
        <div>
          <ForYouWhosPlaying
        />
        </div>
      )}
      {selectedTab === "buyPoints" && (
        <div>
          <BuyPoints />
        </div>
      )}
      {selectedTab === "forYouProfile" && (
        <div>
          <ForYouProfile />
        </div>
      )}
      </div>
    </div>
  );
};

export default ForYou;
