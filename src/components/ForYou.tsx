import React, { useState, useEffect } from "react";
import ForYouTeamsFans from "./ForYouTeamsFans";
import ForYouProfile from "./ForYouProfile";
import ForYouWhosPlaying from "./ForYouWhosPlaying";
// import ForYouProfile from "./ForYouProfile";
import BuyPoints from "./BuyPoints";
import { usePrivy } from "@privy-io/react-auth";
import { getTeamPreferences } from "../lib/kvPerferences";
import { useSearchParams } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
import { MOCK_FIRST_TIME_USER } from "../lib/config";

const ForYou = () => {
  const { user } = usePrivy();
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<string>(""); // Start empty
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  
  // Get profileFid from URL params (for shared cast context)
  const profileFid = searchParams?.get("profileFid");
  const castHash = searchParams?.get("castHash") || undefined;
  const forYouSub = searchParams?.get("forYouSub");

  useEffect(() => {
    const checkPreferences = async () => {
      setIsLoading(true);
      
      // Direct subtab override (used by FTUE CTA buttons)
      if (forYouSub && ["matches", "fellowFollowers", "buyPoints"].includes(forYouSub)) {
        setSelectedTab(forYouSub);
        setIsLoading(false);
        return;
      }

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

      // Mock FTUE: force Fan Clubs for testing regardless of context
      if (MOCK_FIRST_TIME_USER) {
        console.log('ForYou mock: forcing FTUE Fan Clubs');
        setSelectedTab("fellowFollowers");
        setIsLoading(false);
        return;
      }
      
      // Prefer SDK context for fid and install status
      type MiniContext = { client?: { added?: boolean }; user?: { fid?: number } } | null;
      let ctx: MiniContext = null;
      let isAdded = false;
      let fid: number | undefined = undefined;
      try {
        await sdk.actions.ready();
        ctx = await sdk.context;
        // Debug log for context as requested
        console.log('ForYou sdk.context:', ctx);
        fid = ctx?.user?.fid;
        isAdded = Boolean(ctx?.client?.added);
      } catch (e) {
        console.warn('sdk.context unavailable, falling back to Privy user', e);
      }

      // Fallback to Privy-linked Farcaster fid if SDK context missing
      if (!fid) {
        const privyFid = user?.linkedAccounts.find((a) => a.type === "farcaster")?.fid;
        fid = privyFid ? Number(privyFid) : undefined;
      }

      if (fid) {
        try {
          const prefs = await getTeamPreferences(Number(fid));
          const hasTeams = Array.isArray(prefs) && prefs.length > 0;
          console.log('ForYou routing debug:', { fid, isAdded, hasTeams, prefsCount: hasTeams ? prefs.length : 0 });
          // Always route to Who's Playing if the user has favorite teams; otherwise Fan Clubs
          setSelectedTab(hasTeams ? "matches" : "fellowFollowers");
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
