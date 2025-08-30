import React, { useState } from "react";
import OgRewards from "./OgRewards";
import { sdk } from "@farcaster/miniapp-sdk";

const Rewards = () => {
  const [selectedTab, setSelectedTab] = useState<string>("ogRewards");
   const [isMiniApp, setIsMiniApp] = useState<boolean>(false);

  React.useEffect(() => {
    const checkMiniApp = async () => {
      const result = await sdk.isInMiniApp();
      setIsMiniApp(result);
    };
    checkMiniApp();
  }, []);

  if (!isMiniApp) return null;

  return (
    <div className="mb-4">
      {/* Horizontal Scrollable Menu for Tabs */}
      <h2 className="font-2xl text-notWhite font-bold mb-4">Rewards</h2>
      <div className="flex overflow-x-auto space-x-4 mb-4">
        <button
          onClick={() => setSelectedTab("feplWeekly")}
          className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
            selectedTab === "feplWeekly" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
          }`}
        >
          FEPL Weekly Rewards
        </button>
        <button
          onClick={() => setSelectedTab("ogRewards")}
          className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
            selectedTab === "ogRewards" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
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
