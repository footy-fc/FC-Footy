import React, { useState } from "react";
import ContentFalseNine from "./ContentFalseNine";
// import ContentLiveChat from "./ContentLiveChat";

const ContentTab = () => {
  const [selectedTab, setSelectedTab] = useState<string>("falseNine"); // Default to "liveChat"

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div className="mb-4">
      {/* Horizontal Scrollable Menu for Tabs */}
      <h2 className="font-2xl text-notWhite font-bold mb-4"> Live match chat and deep dives</h2>        
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
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === "falseNine" ? "border-limeGreenOpacity text-lightPurple" : "border-gray-500 text-gray-500"
          }`}
        >
          The False Nine
        </button>
      </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 h-[380px] overflow-hidden">        
        {/* {selectedTab === "liveChat" && <ContentLiveChat teamId="NA"/>} */}
        {selectedTab === "falseNine" && <ContentFalseNine />}
      </div>
    </div>
  );
};

export default ContentTab;
