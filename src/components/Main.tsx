/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { use, useCallback, useEffect, useState } from "react";
import sdk, { Context, FrameNotificationDetails } from "@farcaster/frame-sdk";
import TabNavigation from './TabNavigation';
import MatchesTab from './MatchesTab';
import FantasyTab from './FantasyTab';
import FalseNineContent from './FalseNineContent';
import Scout from "./Scout";
import { BASE_URL } from "~/lib/config";

export default function Main() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext | undefined>(undefined);
  const [selectedTab, setSelectedTab] = useState("matches");
  
  useEffect(() => {
    const callAddFrame = async () => {
      
      await sdk.actions.addFrame();
    };

    if (isSDKLoaded) {
      callAddFrame();
    }
  }
  , [isSDKLoaded]);
  useEffect(() => {
    const load = async () => {
      const ctx = await sdk.context;
      setContext(ctx);
      sdk.actions.ready();
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);


  if (!isSDKLoaded) return <div>Waiting for VAR...</div>;

  if (!context) {
    return (
      <div className="w-[375px] mx-auto py-4 px-2">
        <h2 className="text-2xl font-bold text-center text-notWhite">FC Footy mini-app. Live match summaries, fantasy league, analysis and more.</h2>
        <p className="text-center mt-4 text-fontRed">Open in a Farcaster app</p>
        <a href={`https://www.warpcast.com/?launchFrameDomain=${BASE_URL}`} target="_blank" rel="noreferrer" className="block text-center mt-4 text-lightPurple underline">Go to Warpcast</a>
        </div>
    );
  }

  return (
    <div className="w-[400px] mx-auto py-4 px-2">    
      <TabNavigation selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <div className="bg-darkPurple p-4 rounded-md text-white">
        {selectedTab === 'matches' && <MatchesTab />}
        {selectedTab === 'FC FEPL' && <FantasyTab />}
        {selectedTab === 'falseNine' && <FalseNineContent />}
        {selectedTab === 'scout Players' && <Scout />}
        {/* Show generic "Coming soon" message if tab is unrecognized */}
        {['matches', 'FC FEPL', 'scout Players', 'falseNine'].indexOf(selectedTab) === -1 && (
          <div className="text-center text-lg text-fontRed">Coming soon...</div>
        )}
      </div>
      
    </div>
  );
};
