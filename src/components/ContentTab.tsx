import React, { useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import ContentFalseNine from "./ContentFalseNine";
// import FPLAnalytics from "./FPLAnalytics";
// import TokenGatedContent from "./TokenGatedContent";
// import ContentLiveChat from "./ContentLiveChat";

const ContentTab = () => {
  const [selectedTab, setSelectedTab] = useState<string>("falseNine"); // Default to FalseNine

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div className="mb-4">
      {/* Horizontal Scrollable Menu for Tabs */}
      <h2 className="font-2xl text-notWhite font-bold mb-4"> Community builders</h2>        
      <div className="flex overflow-x-auto space-x-4 mb-4">
{/*         <button
          onClick={() => handleTabSelect("liveChat")}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "liveChat" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          Live Chat
        </button> */}

        <button
          onClick={() => handleTabSelect("falseNine")}
          className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
            selectedTab === "falseNine" ? "text-lightPurple underline" : "text-gray-500 hover:text-lightPurple hover:underline"
          }`}
        >
          FalseNine
        </button>

        <button
          onClick={async () => {
            await sdk.actions.openUrl("https://farcaster.xyz/miniapps/Zak_J0bS0z03/fantasy-manager-league");
          }}
          className="flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer text-gray-500 hover:text-lightPurple hover:underline underline-offset-4"
        >
          FML
        </button>

        {/* FC FEPL moved to FC Fantasy tab group */}
      </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-auto">        
        {/* {selectedTab === "liveChat" && <ContentLiveChat teamId="NA"/>} */}
        {selectedTab === "falseNine" && <ContentFalseNine />}
      </div>
    </div>
  );
};

export default ContentTab;
