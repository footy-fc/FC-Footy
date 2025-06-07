/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useSearchParams, useRouter } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import TabNavigation from "./TabNavigation";
import MatchesTab from "./MatchesTab";
import Contests from "./Contests";
import ContentTab from "./ContentTab";
// import Scout from "./Scout";
import Settings from "./Settings";
import MoneyGames from "./MoneyGames";
import ForYou from "./ForYou";
import { tabDisplayMap } from "../lib/navigation";
import { Pingem } from 'pingem-sdk';
import { useAccount } from "wagmi";
import Rewards from "./Rewards";

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

  // Rest of your existing code remains exactly the same...
  const handleTabChange: Dispatch<SetStateAction<string>> = (value) => {
    const newTab =
      typeof value === "function" ? value(selectedTab) : value;
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
      const pingem = new Pingem(); // Create a new instance
      await sdk.actions.ready();
      await pingem.init(sdk, domain); // After the sdk is initialized, init pingem
      await pingem.ping('view'); // Send data to the pingem service
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded, selectedTab]);
  
  // Render main app UI
  return (
    <div className="w-[400px] mx-auto py-2">
      {!isConnected ? (
        <div className="text-center text-lg text-fontRed">
          <button
            className={`flex-1 sm:flex-none w-full sm:w-48 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-deepPink hover:bg-fontRed`}
            onClick={() => window.location.href = "https://farcaster.xyz/miniapps/vRlFDfogkgrw/footy-app"}
          >
            Open Footy Mini-App
          </button>
        </div>
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
            {selectedTab === "contests" && <Contests />}
            {/* {selectedTab === "scoutPlayers" && <Scout />} */}
            {selectedTab === "moneyGames" && <MoneyGames />}
            {selectedTab === "rewards" && <Rewards />}
            {selectedTab === "extraTime" && <ContentTab />}
            {selectedTab === "settings" && <Settings />}
            {selectedTab === "forYou" && <ForYou />}
            {!["forYou", "matches", "contests", "scoutPlayers", "moneyGames", "rewards", "extraTime", "settings"].includes(selectedTab) && (
              <div className="text-center text-lg text-fontRed">Coming soon...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}