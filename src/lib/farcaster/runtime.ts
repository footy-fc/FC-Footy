import { sdk } from '@farcaster/miniapp-sdk';

export type FarcasterRuntime = 'miniapp' | 'standalone';

function browserSuggestsMiniApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const referrer = document.referrer.toLowerCase();

  return (
    ua.includes('farcaster') ||
    ua.includes('warpcast') ||
    referrer.includes('farcaster.xyz') ||
    referrer.includes('warpcast.com')
  );
}

export function detectFarcasterRuntime(): FarcasterRuntime {
  if (typeof window === 'undefined') {
    return 'standalone';
  }

  try {
    if ((window as typeof window & { ReactNativeWebView?: unknown }).ReactNativeWebView) {
      return 'miniapp';
    }

    if (window.self !== window.top) {
      return 'miniapp';
    }
  } catch {
    return 'miniapp';
  }

  try {
    const contextPromise = sdk.context as Promise<{ client?: unknown; user?: { fid?: number } } | null>;
    void contextPromise.then(() => {
      // TODO: promote async context confirmation into a shared runtime store
      // if more routes need reactive runtime upgrades after initial render.
    });
  } catch {
    // Ignore SDK access failures and fall back to browser heuristics.
  }

  return browserSuggestsMiniApp() ? 'miniapp' : 'standalone';
}
