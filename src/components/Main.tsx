/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import frameSdk from "@farcaster/frame-sdk";
import TabNavigation from "./TabNavigation";
import MatchesTab from "./MatchesTab";
import FantasyTab from "./FantasyTab";
import FalseNineContent from "./FalseNineContent";
import Scout from "./Scout";
import MoneyGames from "./MoneyGames";
import { usePrivy } from "@privy-io/react-auth";
import { useLoginToFrame } from "@privy-io/react-auth/farcaster";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { FrameContext } from "@farcaster/frame-node";

export default function Main() {
  const [selectedTab, setSelectedTab] = useState("matches");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { ready, authenticated, user, createWallet, login} = usePrivy();
  const { client } = useSmartWallets();
  const { initLoginToFrame, loginToFrame } = useLoginToFrame();

  // UI state
  const [context, setContext] = useState<FrameContext>();
  const [isFrameContextOpen, setIsFrameContextOpen] = useState(false);
  const [isPrivyUserObjectOpen, setIsPrivyUserObjectOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Loading states
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  // Derived state
  const smartWallet = user?.linkedAccounts.find(
    (account) => account.type === "smart_wallet",
  );
  useEffect(() => {
    const load = async () => {
      setContext(await frameSdk.context);
      frameSdk.actions.ready({});
    };
    if (frameSdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

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
  }, [ready, authenticated]);

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
  }, [authenticated, ready, user]);

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
    <div className="w-[400px] mx-auto py-4 px-2">
      {context === undefined && (
        <h2 className="text-2xl font-bold text-center text-notWhite">
          FC Footy mini-app. Live match summaries, fantasy league, analysis and more.
        </h2>
      )}
      {!authenticated ? (
        <div className="text-center text-lg text-fontRed">
          <p>Please log in to access the app.</p>
          <button
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={handleLogin}
          >
            Login
          </button>
          {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
        </div>
      ) : (
        <>
          <TabNavigation selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
          <div className="bg-darkPurple p-4 rounded-md text-white">
            {selectedTab === "matches" && <MatchesTab />}
            {selectedTab === "FC FEPL" && <FantasyTab />}
            {selectedTab === "falseNine" && <FalseNineContent />}
            {selectedTab === "scout Players" && <Scout />}
           {/* {selectedTab === "money Games" && <MoneyGames />}
            {/* Show generic "Coming soon" message if tab is unrecognized */}
            {!["matches", "FC FEPL", "scout Players", "falseNine"].includes(selectedTab) && (
              <div className="text-center text-lg text-fontRed">Coming soon...</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

