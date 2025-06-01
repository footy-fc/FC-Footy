/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import frameSdk from "@farcaster/frame-sdk";
import { useSearchParams, useRouter } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import TabNavigation from "./TabNavigation";
import MatchesTab from "./MatchesTab";
import Contests from "./Contests";
import ContentTab from "./ContentTab";
import Scout from "./Scout";
import Settings from "./Settings";
import MoneyGames from "./MoneyGames";
import ForYou from "./ForYou";
import { tabDisplayMap } from "../lib/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useLoginToFrame } from "@privy-io/react-auth/farcaster";
import { Pingem } from 'pingem-sdk';

export default function Main() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { ready, authenticated, user, createWallet, login } = usePrivy();
  const { initLoginToFrame, loginToFrame } = useLoginToFrame();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [customSearchParams, setCustomSearchParams] = useState<URLSearchParams | null>(null);
  const effectiveSearchParams = searchParams || customSearchParams;
  const selectedTab = effectiveSearchParams?.get("tab") || "forYou";
  const selectedLeague = effectiveSearchParams?.get("league") || "eng.1";
  const pingem = new Pingem();

  // Handle URL redirect logic
  useEffect(() => {
    if (!effectiveSearchParams) return;

    const shouldRedirect = effectiveSearchParams.get("redirect") === "true";
    const url = effectiveSearchParams.get("url");

    if (shouldRedirect && url) {
      // Validate URL first
      try {
        new URL(url);
        frameSdk.actions.openUrl(url);
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

  // UI state
  //const [context, setContext] = useState<FrameContext>();
  const [errorMessage, setErrorMessage] = useState("");

  // Loading states
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      // const ctx = (await frameSdk.context) as FrameContext;
      //setContext(ctx);

      // Temporarily disable ctx.location logic
      // if (ctx.location && ctx.location?.type === "cast_embed") {
        // console.log("frame context:", ctx);
      //   const url = new URL(ctx.location.type);
      //   const params = new URLSearchParams(url.search);
      //   const newParams = new URLSearchParams();
      //   for (const [key, value] of params.entries()) {
      //     if (key !== "tab") {
      //       newParams.append(key, value);
      //     }
      //   }
      //   newParams.append("tab", selectedTab);
      //   setCustomSearchParams(url.searchParams);
      // }

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

      frameSdk.actions.ready({});
      await pingem.init(frameSdk, domain);
      await frameSdk.actions.addFrame();
      await pingem.ping('view'); 
      console.log("Pingem initialized and frame added");
    };

    if (frameSdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded, selectedTab]);
  
  // Login to Frame with Privy automatically
  useEffect(() => {
    if (ready && !authenticated) {
      const login = async () => {
        const { nonce } = await initLoginToFrame();
        const result = await frameSdk.actions.signIn({ nonce: nonce });
        await loginToFrame({
          message: result.message,
          signature: result.signature,
        });
      };
      login();
    } else if (ready && authenticated) {
    }
  }, [ready, authenticated, initLoginToFrame, loginToFrame]);

  useEffect(() => {
    if (
      authenticated &&
      ready &&
      user &&
      user.linkedAccounts.filter(
        (account) =>
          account.type === "wallet" && account.walletClientType === "privy",
      ).length === 0
    ) {
      createWallet();
    }
  }, [authenticated, createWallet, ready, user]);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      await login(); // Use Privy's login method
    } catch (error) {
      console.error(error);
      setErrorMessage("Login failed. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Render loading state
  if (!ready || isAuthenticating) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }
    
  // Render main app UI
  return (
    <div className="w-[380px] mx-auto py-4 px-2">
      {!authenticated ? (
        <div className="text-center text-lg text-fontRed">
          <button
            className={`flex-1 sm:flex-none w-full sm:w-48 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-deepPink hover:bg-fontRed`}
            onClick={handleLogin}
          >
            Login
          </button>
          {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
        </div>
      ) : (
          <div className="w-[380px] mx-auto py-1 px-2">
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
          {selectedTab === "contests" && <Contests  />}
          {selectedTab === "scoutPlayers" && <Scout />}
          {selectedTab === "moneyGames" && <MoneyGames />}
          
          {selectedTab === "extraTime" && <ContentTab />}
          {selectedTab === "settings" && <Settings />}
          {selectedTab === "forYou" && <ForYou />}
          {!["forYou", "matches", "contests", "scoutPlayers", "moneyGames", "extraTime", "settings"].includes(selectedTab) && (
            <div className="text-center text-lg text-fontRed">Coming soon...</div>
          )}
      </div>
    </div>
      )}
    </div>
  );
}