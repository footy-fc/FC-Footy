/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useSearchParams, useRouter } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import TabNavigation from "./TabNavigation";
import MatchesTab from "./MatchesTab";
// import Contests from "./Contests";
import ContentTab from "./ContentTab";
import Settings from "./Settings";
// import MoneyGames from "./MoneyGames";
import OCaptain from "./OCaptain";
import ForYou from "./ForYou";
import { tabDisplayMap } from "../lib/navigation";
import { Pingem } from 'pingem-sdk';
import { useAccount } from "wagmi";
import Rewards from "./Rewards";
import { IS_TESTING } from "../lib/config";
import Scout from "./Scout";

interface SharedCast {
  author: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  hash: string;
  parentHash?: string;
  parentFid?: number;
  timestamp?: number;
  mentions?: Array<{
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  }>;
  text: string;
  embeds?: string[];
  channelKey?: string;
}

export default function Main() {
  const { isConnected } = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [customSearchParams, setCustomSearchParams] = useState<URLSearchParams | null>(null);
  const effectiveSearchParams = searchParams || customSearchParams;
  const selectedTab = effectiveSearchParams?.get("tab") || "forYou";
  const selectedLeague = effectiveSearchParams?.get("league") || "eng.1";

  // Handle URL redirect logic
  useEffect(() => {
    if (!effectiveSearchParams) return;

    const shouldRedirect = effectiveSearchParams.get("redirect") === "true";
    const url = effectiveSearchParams.get("url");

    if (shouldRedirect && url) {
      // Validate URL first
      try {
        new URL(url);
        sdk.actions.openUrl(url);
      } catch (error: any) {
        console.error("Invalid URL provided:", url, error);
      }
    }
  }, [effectiveSearchParams]);

  // Handle shared cast detection
  useEffect(() => {
    const checkShareContext = async () => {
      try {
        // Check URL parameters first (available immediately)
        const castHash = effectiveSearchParams?.get('castHash');
        const castFid = effectiveSearchParams?.get('castFid');

        // Check URL parameters for share extension

        if (castHash && castFid) {
          // Redirect to ForYou profile tab with cast author's FID
          router.push(`/?tab=forYou&profileFid=${castFid}`);
          return;
        } 
        
        // Check SDK context for share
        await sdk.actions.ready();
        const context = await sdk.context;
        
        if (context?.location?.type === 'cast_share') {
          const cast = context.location.cast as SharedCast;
          // Redirect to ForYou profile tab with cast author's FID
          router.push(`/?tab=forYou&profileFid=${cast.author.fid}`);
        }
      } catch (error) {
        console.error('Error checking share context:', error);
      }
    };

    checkShareContext();
  }, [effectiveSearchParams, router]);

  const handleTabChange: Dispatch<SetStateAction<string>> = (value) => {
    const newTab = typeof value === "function" ? value(selectedTab) : value;
    const league = effectiveSearchParams?.get("league") || "eng.1";
    router.push(`/?tab=${newTab}&league=${league}`);
  };

  const handleLeagueChange = (league: string) => {
    const tab = effectiveSearchParams?.get("tab") || "forYou";
    router.push(`/?tab=${tab}&league=${league}`);
  };

  // Loading states
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      if (typeof window !== "undefined") {
        setCustomSearchParams(new URLSearchParams(window.location.search));
      }

      let domain = "";
      if (typeof window !== "undefined") {
        domain = window.location.hostname;
        if (domain.startsWith("www.")) {
          domain = domain.slice(4);
        }
      } 
      const pingem = new Pingem();
      await sdk.actions.ready();
      await pingem.init(sdk, domain);
      await pingem.ping('view');
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);
    useEffect(() => {
    const load = async () => {
      if (!sdk || !sdk?.actions?.addFrame) return;
      sdk.actions.ready({});
      await sdk.actions.addMiniApp();
    };
    load();
  }, []);

  // Render main app UI
  return (
    <div className="w-[400px] mx-auto py-2">
      {IS_TESTING || !isConnected ? (
        IS_TESTING ? (
          <div className="w-[400px] mx-auto py-1 px-2">
            <div className="text-center text-sm text-gray-400 mb-2">
              Testing Mode - Bypassing Connection Check
            </div>
            <TabNavigation
              selectedTab={selectedTab}
              setSelectedTab={handleTabChange}
              tabDisplayMap={tabDisplayMap}
            />
            <div className="bg-darkPurple p-2 rounded-md text-white">
              {selectedTab === "matches" && (
                <MatchesTab
                  league={selectedLeague}
                  setSelectedTab={handleTabChange}
                  setSelectedLeague={handleLeagueChange}
                />
              )}
              {/* {selectedTab === "contests" && <Contests />} */}
              {/* {selectedTab === "moneyGames" && <MoneyGames />} */}
              {selectedTab === "oCaptain" && <OCaptain />}
              {selectedTab === "rewards" && <Rewards />}
              {selectedTab === "extraTime" && <ContentTab />}
              {selectedTab === "settings" && <Settings />}
              {selectedTab === "forYou" && <ForYou />}
              {selectedTab === "scoutPlayers" && <Scout />}
              {!["forYou", "matches", /* "contests", */ "scoutPlayers", "oCaptain", "rewards", "extraTime", "settings"].includes(selectedTab) && (
                <div className="text-center text-lg text-fontRed">Coming soon...</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-lg text-fontRed">
            <button
              className="flex-1 sm:flex-none w-full sm:w-48 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-deepPink hover:bg-fontRed"
              onClick={() => {
                window.location.href = "https://farcaster.xyz/miniapps/vRlFDfogkgrw/footy-app";
              }}
            >
              Open Footy Mini-App
            </button>
          </div>
        )
      ) : (
        <div className="w-[400px] mx-auto py-1 px-2">
          <TabNavigation
            selectedTab={selectedTab}
            setSelectedTab={handleTabChange}
            tabDisplayMap={tabDisplayMap}
          />
          <div className="bg-darkPurple p-2 rounded-md text-white">
            {selectedTab === "matches" && (
              <MatchesTab
                league={selectedLeague}
                setSelectedTab={handleTabChange}
                setSelectedLeague={handleLeagueChange}
              />
            )}
            {/* {selectedTab === "contests" && <Contests />} */}
            {/* {selectedTab === "moneyGames" && <MoneyGames />} */}
            {selectedTab === "oCaptain" && <OCaptain />}
            {selectedTab === "rewards" && <Rewards />}
            {selectedTab === "extraTime" && <ContentTab />}
            {selectedTab === "settings" && <Settings />}
            {selectedTab === "forYou" && <ForYou />}
            {selectedTab === "scoutPlayers" && <Scout />}
            {!["forYou", "matches", /* "contests", */ "scoutPlayers", "oCaptain", "rewards", "extraTime", "settings"].includes(selectedTab) && (
              <div className="text-center text-lg text-fontRed">Coming soon...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}