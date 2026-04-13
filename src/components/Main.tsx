/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useSearchParams, useRouter } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import TabNavigation from "./TabNavigation";
import AppIdentityBar from "./AppIdentityBar";
import AdminDashboard from "./AdminDashboard";
import HomeTab from "./HomeTab";
import ScoresTab from "./ScoresTab";
import FanClubsTab from "./FanClubsTab";
import FantasyTab from "./FantasyTab";
import ToolsTab from "./ToolsTab";
import ProfileTab from "./ProfileTab";
import { tabDisplayMap } from "../lib/navigation";
import { Pingem } from 'pingem-sdk';
import { useAccount } from "wagmi";
import { IS_TESTING } from "../lib/config";

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
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [miniAppChecked, setMiniAppChecked] = useState(false);
  const effectiveSearchParams = searchParams || customSearchParams;
  const rawSelectedTab = effectiveSearchParams?.get("tab") || "home";
  const selectedTab = (() => {
    switch (rawSelectedTab) {
      case "forYou":
        return "home";
      case "matches":
        return "scores";
      case "moneyGames":
      case "oCaptain":
        return "home";
      case "contests":
        return "fantasy";
      case "scoutPlayers":
        return "tools";
      case "settings":
        return "profile";
      case "fanClubs":
      case "home":
      case "scores":
      case "fantasy":
      case "tools":
      case "profile":
      case "admins":
        return rawSelectedTab;
      default:
        return "home";
    }
  })();
  const [isAdminFid, setIsAdminFid] = useState(false);

  const withTimeout = async <T,>(promise: Promise<T>, fallback: T, timeoutMs = 1500): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const detectMiniAppFallback = () => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const referrer = document.referrer.toLowerCase();
    return (
      ua.includes("farcaster") ||
      ua.includes("warpcast") ||
      referrer.includes("farcaster.xyz") ||
      referrer.includes("warpcast.com")
    );
  };

  useEffect(() => {
    let cancelled = false;
    const detectMiniApp = async () => {
      const fallbackMiniApp = detectMiniAppFallback();
      try {
        const [inMiniApp, context] = await Promise.all([
          withTimeout(sdk.isInMiniApp().catch(() => false), false),
          withTimeout(sdk.context.catch(() => null), null),
        ]);

        if (!cancelled) {
          setIsMiniApp(Boolean(inMiniApp || context?.user?.fid || context?.client || fallbackMiniApp));
        }
      } catch {
        if (!cancelled) {
          setIsMiniApp(fallbackMiniApp);
        }
      } finally {
        if (!cancelled) {
          setMiniAppChecked(true);
        }
      }
    };

    detectMiniApp();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await withTimeout(sdk.actions.ready(), undefined, 1200);
        const context = await withTimeout(sdk.context, null, 1200);
        const fid = context?.user?.fid;
        if (!cancelled) setIsAdminFid(Boolean(fid && [4163, 420564].includes(fid)));
      } catch {
        if (!cancelled) setIsAdminFid(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);
  const shareHandledRef = useRef(false);

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
        // If we've already handled share redirect once in this session, or user navigated away, do nothing
        if (shareHandledRef.current || selectedTab !== "home") return;

        // Check URL parameters first (available immediately)
        const castHash = effectiveSearchParams?.get('castHash');
        const castFid = effectiveSearchParams?.get('castFid');
        const profileFid = effectiveSearchParams?.get('profileFid');

        // Check URL parameters for share extension

        if (castHash && castFid) {
          // Redirect to ForYou profile tab with cast author's FID
          router.push(`/?tab=fanClubs&profileFid=${castFid}`);
          shareHandledRef.current = true;
          return;
        } 
        
        // If profileFid already present, consider handled
        if (profileFid) {
          shareHandledRef.current = true;
          return;
        }

        // Check SDK context for share
        await sdk.actions.ready();
        const context = await sdk.context;
        
        if (context?.location?.type === 'cast_share') {
          const cast = context.location.cast as SharedCast;
          // Redirect to ForYou profile tab with cast author's FID and cast hash
          const hashParam = cast?.hash ? `&castHash=${encodeURIComponent(cast.hash)}` : '';
          router.push(`/?tab=fanClubs&profileFid=${cast.author.fid}${hashParam}`);
          shareHandledRef.current = true;
        }
      } catch (error) {
        console.error('Error checking share context:', error);
      }
    };

    checkShareContext();
  }, [effectiveSearchParams, router, selectedTab]);

  const handleTabChange: Dispatch<SetStateAction<string>> = (value) => {
    const newTab = typeof value === "function" ? value(selectedTab) : value;
    router.push(`/?tab=${newTab}`);
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
      try {
        await withTimeout(sdk.actions.ready(), undefined, 1200);
        await withTimeout(pingem.init(sdk, domain), undefined, 1200);
        await withTimeout(pingem.ping('view'), undefined, 1200);
      } catch (error) {
        console.warn("Pingem boot skipped:", error);
      }
    };

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);
    useEffect(() => {
    const load = async () => {
      try {
        if (!sdk || !sdk?.actions?.addMiniApp) return;
        await withTimeout(sdk.actions.ready({}), undefined, 1200);
        // await sdk.actions.addMiniApp();
      } catch (err) {
        console.warn('addMiniApp failed (likely non-miniapp or dev env):', err);
      }
    };
    load();
  }, []);

  const shouldRenderApp = IS_TESTING || isConnected || isMiniApp;
  // Render main app UI
  return (
    <div className="w-[400px] mx-auto py-2">
      {!miniAppChecked ? (
        <div className="text-center text-sm text-gray-400 py-6">Loading Footy App...</div>
      ) : shouldRenderApp ? (
        <div className="w-[400px] mx-auto px-2 pb-24 pt-1">
          {IS_TESTING && (
            <div className="text-center text-sm text-gray-400 mb-2">
              Testing Mode - Bypassing Connection Check
            </div>
          )}
          <AppIdentityBar
            selectedTab={selectedTab}
            onOpenProfile={() => handleTabChange("profile")}
            onOpenAdmins={() => handleTabChange("admins")}
            isAdminFid={isAdminFid}
          />
          <TabNavigation
            selectedTab={selectedTab}
            setSelectedTab={handleTabChange}
            tabDisplayMap={tabDisplayMap}
          />
          <div className="rounded-[28px] bg-darkPurple p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            {selectedTab === "home" && <HomeTab onNavigate={(tab) => handleTabChange(tab)} />}
            {selectedTab === "scores" && <ScoresTab onNavigate={(tab) => handleTabChange(tab)} />}
            {selectedTab === "fanClubs" && <FanClubsTab />}
            {selectedTab === "fantasy" && <FantasyTab />}
            {selectedTab === "tools" && <ToolsTab />}
            {selectedTab === "profile" && <ProfileTab />}
            {selectedTab === "admins" && isAdminFid && <AdminDashboard />}
            {!["home", "scores", "fanClubs", "fantasy", "tools", "profile", "admins"].includes(selectedTab) && (
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
      )}
    </div>
  );
}
