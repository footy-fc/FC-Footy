'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useFarcasterSigner, useLinkAccount, usePrivy } from '@privy-io/react-auth';
import { useLoginToMiniApp } from '@privy-io/react-auth/farcaster';
import { ExternalEd25519Signer } from '@standard-crypto/farcaster-js';
import { CastAddBody, FarcasterNetwork, makeCastAdd } from '@farcaster/hub-web';
import { detectFarcasterRuntime, type FarcasterRuntime } from '~/lib/farcaster/runtime';
import type { FootyDelegatedApp, FootySignerCustody, FootySignerProvider, FootySignerStatus, FootyWalletProvider } from '~/lib/farcaster/types';
import { fetchUserByFid } from '~/lib/hypersnap';

type FootyCastInput = {
  text: string;
  embeds?: string[];
  mentions?: number[];
  mentionsPositions?: number[];
};

type FootySignedCastPayload = {
  fid: number;
  text: string;
  embeds?: string[];
  message: unknown;
};

type FootyFarcasterProfile = {
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  followerCount?: number;
  followingCount?: number;
};

export type FootyOnboardingState =
  | 'needs_auth'
  | 'needs_email'
  | 'needs_wallet'
  | 'needs_farcaster_account'
  | 'needs_farcaster_signer'
  | 'ready';

export type FootyFarcasterState = {
  runtime: 'miniapp' | 'standalone';
  identityFid?: number;
  linkedFid?: number;
  activeFid?: number;
  hasHostContext: boolean;
  hasFootySession: boolean;
  hasEmail: boolean;
  hasWallet: boolean;
  hasLinkedFarcaster: boolean;
  canWrite: boolean;
  onboardingState: FootyOnboardingState;
  profile: FootyFarcasterProfile;
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  followerCount?: number;
  followingCount?: number;
  signerPublicKey?: string;
  hasFarcaster: boolean;
  hasWalletSigner: boolean;
  hasSigner: boolean;
  delegatedApp: FootyDelegatedApp;
  signerStatus: FootySignerStatus;
  signerProvider?: FootySignerProvider;
  signerCustody?: FootySignerCustody;
  walletProvider?: FootyWalletProvider;
  beginLogin: () => Promise<void>;
  beginPrivyLogin: () => Promise<void>;
  beginLinkEmail: () => Promise<void>;
  beginCreateWallet: () => Promise<void>;
  beginLinkFarcaster: () => Promise<void>;
  beginSignerAuthorization: () => Promise<void>;
  advanceOnboarding: () => Promise<void>;
  requestSigner: () => Promise<void>;
  signCast: (input: string | FootyCastInput) => Promise<unknown>;
  submitSignedMessage: (message: unknown) => Promise<unknown>;
};

type PrivyLinkedAccount = {
  type?: string;
  fid?: number;
  username?: string;
  displayName?: string;
  display_name?: string;
  pfp?: string | null;
  pfpUrl?: string;
  pfp_url?: string;
  signerPublicKey?: string;
};

type MiniAppContext = {
  user?: {
    fid?: number;
    username?: string;
    displayName?: string;
    display_name?: string;
    pfpUrl?: string;
    pfp_url?: string;
  };
};

type FootyAuthHeaders = Record<string, string>;

function getPrivyFarcasterAccount(linkedAccounts: PrivyLinkedAccount[] | undefined) {
  return linkedAccounts?.find((account) => account.type === 'farcaster');
}

function normalizeDisplayName(value?: string) {
  return value && value.trim().length > 0 ? value : undefined;
}

function isAlreadyLinkedFarcasterError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('another user has already linked this farcaster account') ||
    (message.includes('already linked') && message.includes('farcaster'))
  );
}

export function useFootyFarcaster(): FootyFarcasterState {
  const initialRuntime = useMemo(() => detectFarcasterRuntime(), []);
  const [runtime, setRuntime] = useState<FarcasterRuntime>(initialRuntime);
  const [miniAppContext, setMiniAppContext] = useState<MiniAppContext | null>(null);
  const [isRequestingSigner, setIsRequestingSigner] = useState(false);
  const [freshProfile, setFreshProfile] = useState<FootyFarcasterProfile>({});
  const { ready, authenticated, user, login, logout, linkEmail, createWallet } = usePrivy();
  const { initLoginToMiniApp, loginToMiniApp } = useLoginToMiniApp();
  const { linkFarcaster } = useLinkAccount();
  const { getFarcasterSignerPublicKey, requestFarcasterSignerFromWarpcast, signFarcasterMessage } = useFarcasterSigner();

  useEffect(() => {
    let cancelled = false;

    const loadMiniAppContext = async () => {
      if (runtime !== 'miniapp') {
        return;
      }

      try {
        await sdk.actions.ready();
        const context = (await sdk.context) as MiniAppContext | null;
        if (!cancelled) {
          setMiniAppContext(context);
          if (context?.user?.fid) {
            setRuntime('miniapp');
          }
        }
      } catch {
        if (!cancelled) {
          setMiniAppContext(null);
        }
      }
    };

    void loadMiniAppContext();

    return () => {
      cancelled = true;
    };
  }, [runtime]);

  const privyFarcaster = getPrivyFarcasterAccount(user?.linkedAccounts as PrivyLinkedAccount[] | undefined);
  const identityFid = miniAppContext?.user?.fid;
  const linkedFid = privyFarcaster?.fid;
  const activeFid = runtime === 'miniapp' ? identityFid : linkedFid;
  const fallbackUsername =
    runtime === 'miniapp'
      ? normalizeDisplayName(miniAppContext?.user?.username)
      : normalizeDisplayName(privyFarcaster?.username);
  const fallbackDisplayName =
    runtime === 'miniapp'
      ? normalizeDisplayName(miniAppContext?.user?.displayName || miniAppContext?.user?.display_name)
      : normalizeDisplayName(privyFarcaster?.displayName || privyFarcaster?.display_name);
  const fallbackPfpUrl =
    runtime === 'miniapp'
      ? normalizeDisplayName(miniAppContext?.user?.pfpUrl || miniAppContext?.user?.pfp_url)
      : normalizeDisplayName(
          privyFarcaster?.pfp ?? privyFarcaster?.pfpUrl ?? privyFarcaster?.pfp_url ?? (user as { farcaster?: { pfp?: string | null } } | undefined)?.farcaster?.pfp ?? undefined
        );
  const signerPublicKey = privyFarcaster?.signerPublicKey;
  const hasHostContext = Boolean(identityFid);
  const hasFootySession = Boolean(authenticated);
  const hasEmail = Boolean(user?.email?.address);
  const hasWallet = Boolean(user?.wallet?.address);
  const hasLinkedFarcaster = Boolean(linkedFid);
  const hasFarcaster = Boolean(activeFid);
  const hasWalletSigner = hasFootySession;
  const hasSigner = Boolean(signerPublicKey);
  const canWrite = hasFootySession && hasLinkedFarcaster && hasSigner;
  const onboardingState: FootyOnboardingState = !hasFootySession
    ? 'needs_auth'
    : !hasEmail
      ? 'needs_email'
      : !hasWallet
        ? 'needs_wallet'
        : !hasLinkedFarcaster
          ? 'needs_farcaster_account'
          : !hasSigner
            ? 'needs_farcaster_signer'
            : 'ready';
  const signerStatus: FootySignerStatus = hasSigner ? 'authorized' : isRequestingSigner ? 'pending' : 'none';
  const profile = useMemo<FootyFarcasterProfile>(
    () => ({
      username: freshProfile.username || fallbackUsername,
      displayName: freshProfile.displayName || fallbackDisplayName,
      pfpUrl: freshProfile.pfpUrl || fallbackPfpUrl,
      followerCount: freshProfile.followerCount,
      followingCount: freshProfile.followingCount,
    }),
    [fallbackDisplayName, fallbackPfpUrl, fallbackUsername, freshProfile]
  );
  const username = profile.username;
  const displayName = profile.displayName;
  const pfpUrl = profile.pfpUrl;
  const followerCount = profile.followerCount;
  const followingCount = profile.followingCount;

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!activeFid) {
        if (!cancelled) {
          setFreshProfile({});
        }
        return;
      }

      try {
        const userProfile = await fetchUserByFid(activeFid);
        if (!cancelled) {
          setFreshProfile({
            username: normalizeDisplayName(userProfile?.username),
            displayName: normalizeDisplayName(userProfile?.display_name || userProfile?.displayName),
            pfpUrl: normalizeDisplayName(userProfile?.pfp_url),
            followerCount: typeof userProfile?.follower_count === 'number' ? userProfile.follower_count : undefined,
            followingCount: typeof userProfile?.following_count === 'number' ? userProfile.following_count : undefined,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Footy Farcaster profile fetch skipped:', error);
          setFreshProfile({});
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [activeFid]);

  const getAuthorizationHeaders = useCallback(async (): Promise<FootyAuthHeaders> => {
    if (user?.id) {
      return {
        'x-footy-runtime': 'standalone',
        'x-footy-user-id': `privy:${user.id}`,
        ...(linkedFid ? { 'x-footy-fid': String(linkedFid) } : {}),
      };
    }

    if (runtime === 'miniapp') {
      const quickAuth = (sdk as typeof sdk & { experimental?: { quickAuth?: (opts?: { force?: boolean }) => Promise<string> } }).experimental;
      const token = quickAuth?.quickAuth ? await quickAuth.quickAuth({ force: false }) : null;

      if (!token) {
        throw new Error('Mini app auth is unavailable');
      }

      return {
        Authorization: `Bearer ${token}`,
        'x-footy-runtime': 'miniapp',
      };
    }

    if (!user?.id) {
      throw new Error('Sign in to use Footy as a Farcaster client');
    }

    throw new Error('Unable to resolve Footy authentication headers');
  }, [linkedFid, runtime, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const syncAccount = async () => {
      if (!hasFarcaster || !ready) {
        return;
      }

      if (runtime === 'standalone' && !authenticated) {
        return;
      }

      try {
        const headers = await getAuthorizationHeaders();
        const response = await fetch('/api/farcaster/account/sync', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            runtime,
            fid: activeFid,
            username,
            displayName,
            signerPublicKey: signerPublicKey || null,
            delegatedApp: 'footy',
            signerStatus,
            signerProvider: runtime === 'miniapp' ? 'miniapp' : 'privy',
            signerCustody: runtime === 'miniapp' ? 'miniapp-hosted' : 'client-delegated',
            walletProvider: runtime === 'miniapp' ? 'miniapp' : 'privy',
          }),
        });

        if (!response.ok && !cancelled) {
          const payload: unknown = await response.json().catch(() => ({}));
          console.warn('Footy Farcaster sync skipped:', payload);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Footy Farcaster sync skipped:', error);
        }
      }
    };

    void syncAccount();

    return () => {
      cancelled = true;
    };
  }, [activeFid, authenticated, displayName, getAuthorizationHeaders, hasFarcaster, ready, runtime, signerPublicKey, signerStatus, username]);

  const beginLogin = useCallback(async () => {
    if (authenticated) {
      return;
    }

    if (runtime === 'miniapp' && ready) {
      try {
        const { nonce } = await initLoginToMiniApp();
        const result = await sdk.actions.signIn({ nonce });
        await loginToMiniApp({
          message: result.message,
          signature: result.signature,
        });
        return;
      } catch (error) {
        console.warn('Mini app Privy login fell back to modal login:', error);
      }
    }

    login();
  }, [authenticated, initLoginToMiniApp, login, loginToMiniApp, ready, runtime]);

  const beginPrivyLogin = useCallback(async () => {
    if (authenticated) {
      return;
    }

    login({ loginMethods: ['email', 'wallet', 'farcaster'] });
  }, [authenticated, login]);

  const beginStandaloneFarcasterLogin = useCallback(async () => {
    if (authenticated) {
      await logout();
    }

    login({ loginMethods: ['farcaster'] });
  }, [authenticated, login, logout]);

  const beginLinkEmail = useCallback(async () => {
    if (!authenticated) {
      if (runtime === 'miniapp') {
        await beginPrivyLogin();
      } else {
        await beginLogin();
      }
      return;
    }

    if (!user?.email?.address) {
      linkEmail();
    }
  }, [authenticated, beginLogin, beginPrivyLogin, linkEmail, runtime, user?.email?.address]);

  const beginCreateWallet = useCallback(async () => {
    if (!authenticated) {
      if (runtime === 'miniapp') {
        await beginPrivyLogin();
      } else {
        await beginLogin();
      }
      return;
    }

    if (!user?.wallet?.address) {
      await createWallet();
    }
  }, [authenticated, beginLogin, beginPrivyLogin, createWallet, runtime, user?.wallet?.address]);

  const beginLinkFarcaster = useCallback(async () => {
    if (!authenticated) {
      if (runtime === 'miniapp') {
        await beginPrivyLogin();
      } else {
        await beginLogin();
      }
      return;
    }

    if (!privyFarcaster?.fid) {
      try {
        await linkFarcaster();
      } catch (error) {
        if (runtime === 'standalone' && isAlreadyLinkedFarcasterError(error)) {
          await beginStandaloneFarcasterLogin();
          return;
        }

        throw error;
      }
    }
  }, [authenticated, beginLogin, beginPrivyLogin, beginStandaloneFarcasterLogin, linkFarcaster, privyFarcaster?.fid, runtime]);

  const beginSignerAuthorization = useCallback(async () => {
    if (!authenticated) {
      if (runtime === 'miniapp') {
        await beginPrivyLogin();
      } else {
        await beginLogin();
      }
      return;
    }

    if (!user?.email?.address) {
      await beginLinkEmail();
      return;
    }

    if (!user?.wallet?.address) {
      await beginCreateWallet();
      return;
    }

    if (!privyFarcaster?.fid) {
      await beginLinkFarcaster();
      return;
    }

    setIsRequestingSigner(true);
    try {
      await requestFarcasterSignerFromWarpcast();
    } finally {
      setIsRequestingSigner(false);
    }
  }, [
    authenticated,
    beginCreateWallet,
    beginLinkEmail,
    beginLinkFarcaster,
    beginLogin,
    beginPrivyLogin,
    privyFarcaster?.fid,
    requestFarcasterSignerFromWarpcast,
    runtime,
    user?.email?.address,
    user?.wallet?.address,
  ]);

  const advanceOnboarding = useCallback(async () => {
    switch (onboardingState) {
      case 'needs_auth':
        await beginLogin();
        return;
      case 'needs_email':
        await beginLinkEmail();
        return;
      case 'needs_wallet':
        await beginCreateWallet();
        return;
      case 'needs_farcaster_account':
        await beginLinkFarcaster();
        return;
      case 'needs_farcaster_signer':
        await beginSignerAuthorization();
        return;
      case 'ready':
        return;
    }
  }, [
    beginCreateWallet,
    beginLinkEmail,
    beginLinkFarcaster,
    beginLogin,
    beginSignerAuthorization,
    onboardingState,
  ]);

  const requestSigner = beginSignerAuthorization;

  const signCast = useCallback(
    async (input: string | FootyCastInput) => {
      const text = typeof input === 'string' ? input : input.text;
      const embeds = typeof input === 'string' ? [] : (input.embeds || []);
      const mentions = typeof input === 'string' ? [] : (input.mentions || []);
      const mentionsPositions = typeof input === 'string' ? [] : (input.mentionsPositions || []);

      if (!text.trim()) {
        throw new Error('Cast text is required');
      }

      if (mentions.length !== mentionsPositions.length) {
        throw new Error('Cast mentions are invalid');
      }

      if (!linkedFid) {
        throw new Error('Connect Farcaster before posting');
      }

      if (!hasSigner) {
        throw new Error('Authorize Footy signer before posting');
      }

      const signer = new ExternalEd25519Signer(signFarcasterMessage, getFarcasterSignerPublicKey);
      const body = CastAddBody.create({
        text,
        embeds: embeds.map((url) => ({ url })),
        mentions,
        mentionsPositions,
      });
      const messageResult = await makeCastAdd(
        body,
        {
          fid: linkedFid,
          network: FarcasterNetwork.MAINNET,
        },
        signer
      );

      if (messageResult.isErr()) {
        throw messageResult.error;
      }

      return {
        fid: linkedFid,
        text,
        embeds,
        message: messageResult.value,
      } satisfies FootySignedCastPayload;
    },
    [getFarcasterSignerPublicKey, hasSigner, linkedFid, signFarcasterMessage]
  );

  const submitSignedMessage = useCallback(
    async (message: unknown) => {
      const payload = message as Partial<FootySignedCastPayload>;
      const headers = await getAuthorizationHeaders();
      const response = await fetch('/api/farcaster/cast', {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          fid: payload.fid,
          text: payload.text,
          message: payload.message,
        }),
      });

      const payloadResponse: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error =
          payloadResponse && typeof payloadResponse === 'object' && 'error' in payloadResponse && typeof (payloadResponse as Record<string, unknown>).error === 'string'
            ? (payloadResponse as Record<string, string>).error
            : 'Failed to submit Farcaster message';

        throw new Error(error);
      }

      return payloadResponse;
    },
    [getAuthorizationHeaders]
  );

  return {
    runtime,
    identityFid,
    linkedFid,
    activeFid,
    hasHostContext,
    hasFootySession,
    hasEmail,
    hasWallet,
    hasLinkedFarcaster,
    canWrite,
    onboardingState,
    profile,
    fid: activeFid,
    username,
    displayName,
    pfpUrl,
    followerCount,
    followingCount,
    signerPublicKey,
    hasFarcaster,
    hasWalletSigner,
    hasSigner,
    delegatedApp: 'footy',
    signerStatus,
    signerProvider: runtime === 'miniapp' ? 'miniapp' : 'privy',
    signerCustody: runtime === 'miniapp' ? 'miniapp-hosted' : 'client-delegated',
    walletProvider: runtime === 'miniapp' ? 'miniapp' : 'privy',
    beginLogin,
    beginPrivyLogin,
    beginLinkEmail,
    beginCreateWallet,
    beginLinkFarcaster,
    beginSignerAuthorization,
    advanceOnboarding,
    requestSigner,
    signCast,
    submitSignedMessage,
  };
}
