import React, { useState, useEffect } from "react";
import ForYouTeamsFans from "./ForYouTeamsFans";
import ForYouProfile from "./ForYouProfile";
import ForYouWhosPlaying from "./ForYouWhosPlaying";
// import ForYouProfile from "./ForYouProfile";
import BuyPoints from "./BuyPoints";
import { usePrivy } from "@privy-io/react-auth";
import { getTeamPreferences } from "../lib/kvPerferences";
import { useSearchParams } from "next/navigation";

const ForYou = () => {
  const { user } = usePrivy();
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<string>(""); // Start empty
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  
  // Get profileFid from URL params (for shared cast context)
  const profileFid = searchParams?.get("profileFid");
  const castHash = searchParams?.get("castHash") || undefined;

  useEffect(() => {
    const checkPreferences = async () => {
      setIsLoading(true);
      
      // Check if we should show Buy Points section
      const showBuyPoints = searchParams?.get("showBuyPoints");
      if (showBuyPoints === "true") {
        setSelectedTab("buyPoints");
        setIsLoading(false);
        return;
      }
      
      // If we have a profileFid from share extension, show that profile
      if (profileFid) {
        setSelectedTab("fellowFollowers");
        setIsLoading(false);
        return;
      }
      
      const fid = user?.linkedAccounts.find((a) => a.type === "farcaster")?.fid;
      if (fid) {
        try {
          const prefs = await getTeamPreferences(fid);
          if (!prefs || prefs.length === 0) {
            setSelectedTab("fellowFollowers"); // Show Fan Clubs for users with no teams
          } else {
            setSelectedTab("matches"); // Show Who's Playing for users with teams
          }
        } catch (error) {
          console.error("Error checking team preferences:", error);
          setSelectedTab("fellowFollowers"); // Default to Fan Clubs on error
        }
      } else {
        // No user or FID, default to Fan Clubs
        setSelectedTab("fellowFollowers");
      }
      
      setIsLoading(false);
    };
    
    checkPreferences();
  }, [user, profileFid, searchParams]);

  // Show loading state while determining the correct tab
  if (isLoading) {
    return (
      <div className="mb-4">
        <h2 className="font-2xl text-notWhite font-bold mb-4">Fan Experience</h2>
        <div className="bg-purplePanel text-lightPurple rounded-lg p-4 text-center">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Horizontal Scrollable Menu for Tabs */}
      <h2 className="font-2xl text-notWhite font-bold mb-4">
        Fan Experience
      </h2>        
      <div className="flex overflow-x-auto space-x-4 mb-4">
        {/* Conditional if there are fav teams being followed */}
        {showLiveChat ? (
            <button
            onClick={() => setShowLiveChat(false)}
            className="flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer text-lightPurple underline underline-offset-4"
            >
            ← Back
            </button>
        ) : (
            <>
            <button
              onClick={() => setSelectedTab("matches")}
              className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
                selectedTab === "matches" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
              }`}
            >
              Who&apos;s Playing
            </button>
            <button
            onClick={() => setSelectedTab("fellowFollowers")}
            className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
                selectedTab === "fellowFollowers" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
            }`}
            >
            Fan Clubs
            </button>
            <button
              onClick={() => setSelectedTab("buyPoints")}
              className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
                selectedTab === "buyPoints" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
              }`}
            >
              Buy $SCORES
            </button>
            </>
        )}
        </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">        
      {selectedTab === "fellowFollowers" && (
        <>
          {profileFid ? (
            <ForYouProfile profileFid={Number(profileFid)} castHash={castHash} />
          ) : (
            <ForYouTeamsFans
              showLiveChat={showLiveChat}
              setShowLiveChat={setShowLiveChat}
            />
          )}
        </>
      )}
      {selectedTab === "matches" && (
        <div>
          <ForYouWhosPlaying />
        </div>
      )}
      {selectedTab === "buyPoints" && (
        <div>
          <BuyPoints />
        </div>
      )}
      </div>
    </div>
  );
};

export default ForYou;
