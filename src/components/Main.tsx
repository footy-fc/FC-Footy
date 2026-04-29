/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import "@farcaster/auth-kit/styles.css";
import { AuthKitProvider, SignInButton } from "@farcaster/auth-kit";
import { usePrivy } from "@privy-io/react-auth";
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
import { IS_TESTING } from "../lib/config";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

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

function BrowserAuthFallback({
  authError,
  authLoading,
  onAuthError,
  onVerified,
}: {
  authError: string | null;
  authLoading: boolean;
  onAuthError: (message: string | null) => void;
  onVerified: (fid: number) => void;
}) {
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_URL || "https://fc-footy.vercel.app";
  const domain =
    typeof window !== "undefined"
      ? window.location.hostname
      : new URL(appUrl).hostname;

  return (
    <AuthKitProvider
      config={{
        domain,
        siweUri: `${appUrl}/login`,
        rpcUrl: "https://mainnet.optimism.io",
      }}
    >
      <div className="mx-auto w-[400px] rounded-[28px] bg-darkPurple p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="app-section-title mb-3">Authenticate to Continue</div>
        <p className="app-copy mb-4">
          Footy could not confirm a Mini App host, so sign in with Farcaster to verify your FID before entering the app.
        </p>
        {authError && <p className="mb-4 text-sm text-fontRed">{authError}</p>}
        <div className="flex flex-col gap-3 items-center">
          <div className={authLoading ? "pointer-events-none opacity-70" : ""}>
            <SignInButton
              onSuccess={({ fid }) => {
                if (typeof fid !== "number") {
                  onAuthError("Authentication succeeded but no FID was returned");
                  return;
                }
                onAuthError(null);
                onVerified(fid);
              }}
              onError={(error) => {
                onAuthError(error?.message || "Authentication failed");
              }}
            />
          </div>
          <button
            className="w-full sm:w-48 border border-limeGreenOpacity text-lightPurple py-2 px-4 rounded-lg transition-colors hover:bg-purplePanel"
            onClick={() => {
              window.location.href = "https://farcaster.xyz/miniapps/vRlFDfogkgrw/footy-app";
            }}
          >
            Open Footy Mini-App
          </button>
        </div>
      </div>
    </AuthKitProvider>
  );
}

function FarcasterLandingGate({
  selectedTab,
}: {
  selectedTab: string;
}) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const { ready, authenticated } = usePrivy();
  const { beginLogin, hasFarcaster, hasSigner, signerStatus, requestSigner } = useFootyFarcaster();

  useEffect(() => {
    if (ready && authenticated && hasFarcaster && hasSigner) {
      setActionMessage(null);
    }
  }, [authenticated, hasFarcaster, hasSigner, ready]);

  if (selectedTab !== "home" || !ready || authenticated || (hasFarcaster && hasSigner)) {
    return null;
  }

  const currentStep = "Sign in to Footy";

  const handleContinue = async () => {
    setActionMessage(null);

    if (!ready || !authenticated) {
      await beginLogin();
      return;
    }

    setIsWorking(true);
    try {
      await requestSigner();
      setActionMessage("Continue the Footy authorization flow to finish Farcaster setup.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to continue Footy Farcaster setup.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="mb-4 rounded-[24px] border border-deepPink/30 bg-[linear-gradient(135deg,rgba(255,0,102,0.12),rgba(18,12,36,0.96))] p-5 text-notWhite shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <div className="mb-2 app-eyebrow">Footy App on Farcaster</div>
      <h2 className="mb-2 text-[30px] font-semibold leading-[1.02] text-notWhite">
        Sign in to share matches from Footy.
      </h2>
      <p className="mb-4 max-w-[34rem] text-sm leading-6 text-lightPurple">
        Use your Footy account first. Once you are in, connecting Farcaster and approving the signer stays inside the normal app flow.
      </p>
      <button
        type="button"
        onClick={() => void handleContinue()}
        disabled={isWorking || signerStatus === "pending"}
        className="rounded-xl bg-deepPink px-5 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85 disabled:opacity-70"
      >
        {isWorking || signerStatus === "pending" ? "Opening setup..." : currentStep}
      </button>
      {actionMessage ? (
        <div className="mt-3 text-sm text-lightPurple">{actionMessage}</div>
      ) : null}
    </div>
  );
}

export default function Main() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { fid: footyFarcasterFid } = useFootyFarcaster();
  const [customSearchParams, setCustomSearchParams] = useState<URLSearchParams | null>(null);
  const [miniAppChecked, setMiniAppChecked] = useState(false);
  const [verifiedFid, setVerifiedFid] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
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

  const detectLikelyMiniAppHost = () => {
    if (typeof window === "undefined") return false;

    try {
      if (window.ReactNativeWebView) return true;
      if (window.self !== window.top) return true;
    } catch {
      // Cross-origin iframe access errors still imply an embedded host.
      return true;
    }

    return detectMiniAppFallback();
  };

  useEffect(() => {
    let cancelled = false;

    const confirmMiniApp = async (timeoutMs: number) => {
      const [inMiniApp, context] = await Promise.all([
        withTimeout(sdk.isInMiniApp().catch(() => false), false, timeoutMs),
        withTimeout(sdk.context.catch(() => null), null, timeoutMs),
      ]);

      return {
        isMiniApp: Boolean(inMiniApp || context?.user?.fid || context?.client),
        fid: typeof context?.user?.fid === "number" ? context.user.fid : null,
      };
    };

    const detectMiniApp = async () => {
      const likelyHostedMiniApp = detectLikelyMiniAppHost();
      try {
        const initialDetection = await confirmMiniApp(likelyHostedMiniApp ? 1500 : 800);

        if (!cancelled) {
          if (initialDetection.fid) setVerifiedFid(initialDetection.fid);
        }

        if (!initialDetection.isMiniApp && likelyHostedMiniApp) {
          const retryDetection = await confirmMiniApp(3500);

          if (!cancelled) {
            if (retryDetection.fid) setVerifiedFid(retryDetection.fid);
          }
        }
      } catch {
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

  const currentViewerFid = footyFarcasterFid ?? verifiedFid ?? undefined;

  useEffect(() => {
    setIsAdminFid(Boolean(currentViewerFid && [4163, 420564].includes(currentViewerFid)));
  }, [currentViewerFid]);
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

  const handleOpenTeam = (teamId: string) => {
    router.push(`/?tab=fanClubs&teamId=${encodeURIComponent(teamId)}`);
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

  const shouldRenderApp = miniAppChecked;
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
          {!ready || !authenticated ? (
            <FarcasterLandingGate selectedTab="home" />
          ) : (
            <>
              <AppIdentityBar
                selectedTab={selectedTab}
                onOpenProfile={() => handleTabChange("profile")}
                onOpenAdmins={() => handleTabChange("admins")}
                onOpenTeam={handleOpenTeam}
                isAdminFid={isAdminFid}
                viewerFid={currentViewerFid}
              />
              <TabNavigation
                selectedTab={selectedTab}
                setSelectedTab={handleTabChange}
                tabDisplayMap={tabDisplayMap}
              />
              <div className="rounded-[28px] bg-darkPurple p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
                {selectedTab === "home" && <HomeTab onNavigate={(tab) => handleTabChange(tab)} viewerFid={currentViewerFid} />}
                {selectedTab === "scores" && <ScoresTab onNavigate={(tab) => handleTabChange(tab)} />}
                {selectedTab === "fanClubs" && <FanClubsTab viewerFid={currentViewerFid} />}
                {selectedTab === "fantasy" && <FantasyTab />}
                {selectedTab === "tools" && <ToolsTab />}
                {selectedTab === "profile" && <ProfileTab viewerFid={currentViewerFid} />}
                {selectedTab === "admins" && isAdminFid && <AdminDashboard />}
                {!["home", "scores", "fanClubs", "fantasy", "tools", "profile", "admins"].includes(selectedTab) && (
                  <div className="text-center text-lg text-fontRed">Coming soon...</div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <BrowserAuthFallback
          authError={authError}
          authLoading={false}
          onAuthError={setAuthError}
          onVerified={(fid) => setVerifiedFid(fid)}
        />
      )}
    </div>
  );
}
