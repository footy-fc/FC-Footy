'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useFarcasterSigner, useLinkAccount, usePrivy, useWallets } from '@privy-io/react-auth';
import { useLoginToMiniApp } from '@privy-io/react-auth/farcaster';
import { ExternalEd25519Signer } from '@standard-crypto/farcaster-js';
import { ViemWalletEip712Signer, makeUserNameProofClaim } from '@farcaster/core';
import { CastAddBody, FarcasterNetwork, makeCastAdd } from '@farcaster/hub-web';
import { FOOTBALL_PARENT_URL } from '~/lib/farcaster/channels';
import { detectFarcasterRuntime, type FarcasterRuntime } from '~/lib/farcaster/runtime';
import type { FootyDelegatedApp, FootySignerCustody, FootySignerProvider, FootySignerStatus, FootyWalletProvider } from '~/lib/farcaster/types';
import { deriveHubProfilePatch, fetchUserByFid, fetchUserDataMessagesByFid, fetchUsernameProofsByFid, fetchVerificationMessagesByFid } from '~/lib/hypersnap';
import { bytesToHex, createWalletClient, custom, hexToBytes, isAddress } from 'viem';
import { optimism } from 'viem/chains';

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
  message?: unknown;
};

type FootyFarcasterProfile = {
  username?: string;
  proofUsername?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  verifications?: string[];
  followerCount?: number;
  followingCount?: number;
};

type StoredFootyAccount = {
  fid: number;
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
  bio?: string | null;
  custodyAddress?: string | null;
  signerPublicKey?: string | null;
  signerStatus?: FootySignerStatus;
  signerProvider?: FootySignerProvider;
  signerCustody?: FootySignerCustody;
  walletProvider?: FootyWalletProvider;
};

const FOOTY_FARCASTER_PROFILE_EVENT = 'footy:farcaster-profile-updated';

type FootyProfileUpdateEventDetail = {
  account?: StoredFootyAccount | null;
  profile?: Partial<FootyFarcasterProfile> & { bio?: string };
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
  isHydratingAccount: boolean;
  canWrite: boolean;
  onboardingState: FootyOnboardingState;
  profile: FootyFarcasterProfile;
  fid?: number;
  username?: string;
  proofUsername?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
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
  isProvisioningFarcasterAccount: boolean;
  onboardingError?: string;
  beginLogin: () => Promise<void>;
  beginPrivyLogin: () => Promise<void>;
  beginLinkEmail: () => Promise<void>;
  beginCreateWallet: () => Promise<void>;
  beginLinkFarcaster: () => Promise<void>;
  beginCreateFarcasterAccount: () => Promise<void>;
  beginSignerAuthorization: () => Promise<void>;
  advanceOnboarding: () => Promise<void>;
  requestSigner: () => Promise<void>;
  updateManagedProfile: (input: { username?: string; displayName?: string; pfpUrl?: string; bio?: string }) => Promise<void>;
  claimManagedUsername: (username: string) => Promise<void>;
  signCast: (input: string | FootyCastInput) => Promise<unknown>;
  submitSignedMessage: (message: unknown) => Promise<unknown>;
  getAuthorizationHeaders: () => Promise<FootyAuthHeaders>;
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

function normalizeFarcasterUsername(value?: string) {
  const normalized = normalizeDisplayName(value);
  if (!normalized) {
    return undefined;
  }

  return /^fid:\d+$/i.test(normalized) ? undefined : normalized;
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

function normalizeAddress(value?: string | null) {
  return value ? value.toLowerCase() : undefined;
}

function dispatchProfileUpdate(detail: FootyProfileUpdateEventDetail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<FootyProfileUpdateEventDetail>(FOOTY_FARCASTER_PROFILE_EVENT, { detail }));
}

export function useFootyFarcaster(): FootyFarcasterState {
  const initialRuntime = useMemo(() => detectFarcasterRuntime(), []);
  const [runtime, setRuntime] = useState<FarcasterRuntime>(initialRuntime);
  const [miniAppContext, setMiniAppContext] = useState<MiniAppContext | null>(null);
  const [isRequestingSigner, setIsRequestingSigner] = useState(false);
  const [isCreatingFarcasterAccount, setIsCreatingFarcasterAccount] = useState(false);
  const [shouldProvisionFarcasterAccount, setShouldProvisionFarcasterAccount] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | undefined>(undefined);
  const [freshProfile, setFreshProfile] = useState<FootyFarcasterProfile>({});
  const [storedAccount, setStoredAccount] = useState<StoredFootyAccount | null>(null);
  const [hasLoadedStoredAccount, setHasLoadedStoredAccount] = useState(false);
  const { ready, authenticated, user, login, logout, linkEmail, createWallet } = usePrivy();
  const { wallets } = useWallets();
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
  const storedFid = storedAccount?.fid;
  const identityFid = miniAppContext?.user?.fid;
  const linkedFid = privyFarcaster?.fid;
  const activeFid = runtime === 'miniapp' ? identityFid : (linkedFid || storedFid);
  const fallbackUsername =
    runtime === 'miniapp'
      ? normalizeFarcasterUsername(miniAppContext?.user?.username)
      : normalizeFarcasterUsername(privyFarcaster?.username || undefined);
  const fallbackDisplayName =
    runtime === 'miniapp'
      ? normalizeDisplayName(miniAppContext?.user?.displayName || miniAppContext?.user?.display_name)
      : normalizeDisplayName(privyFarcaster?.displayName || privyFarcaster?.display_name || storedAccount?.displayName || undefined);
  const fallbackPfpUrl =
    runtime === 'miniapp'
      ? normalizeDisplayName(miniAppContext?.user?.pfpUrl || miniAppContext?.user?.pfp_url)
      : normalizeDisplayName(
          privyFarcaster?.pfp ?? privyFarcaster?.pfpUrl ?? privyFarcaster?.pfp_url ?? storedAccount?.pfpUrl ?? (user as { farcaster?: { pfp?: string | null } } | undefined)?.farcaster?.pfp ?? undefined
        );
  const signerPublicKey = privyFarcaster?.signerPublicKey;
  const hasHostContext = Boolean(identityFid);
  const hasFootySession = Boolean(authenticated);
  const hasEmail = Boolean(user?.email?.address);
  const hasWallet = Boolean(user?.wallet?.address);
  const hasLinkedFarcaster = Boolean(linkedFid);
  const hasStoredFarcaster = Boolean(storedFid);
  const isHydratingAccount =
    runtime !== 'miniapp' &&
    authenticated &&
    Boolean(user?.id) &&
    !hasLinkedFarcaster &&
    !hasLoadedStoredAccount;
  const effectiveSignerPublicKey = signerPublicKey || storedAccount?.signerPublicKey || undefined;
  const hasFarcaster = Boolean(activeFid);
  const isProvisioningFarcasterAccount = shouldProvisionFarcasterAccount || isCreatingFarcasterAccount;
  const hasWalletSigner = hasFootySession;
  const hasSigner = Boolean(effectiveSignerPublicKey);
  const canWrite = hasFootySession && hasFarcaster && hasSigner;
  const onboardingState: FootyOnboardingState = !hasFootySession
    ? 'needs_auth'
    : !hasEmail
      ? 'needs_email'
      : !hasWallet
        ? 'needs_wallet'
        : !hasFarcaster
          ? 'needs_farcaster_account'
          : !hasSigner
            ? 'needs_farcaster_signer'
            : 'ready';
  const signerStatus: FootySignerStatus =
    storedAccount?.signerStatus || (hasSigner ? 'authorized' : isRequestingSigner || isCreatingFarcasterAccount ? 'pending' : 'none');
  const profile = useMemo<FootyFarcasterProfile>(
    () => ({
      username: freshProfile.username || fallbackUsername,
      proofUsername: freshProfile.proofUsername,
      displayName: freshProfile.displayName || fallbackDisplayName,
      pfpUrl: freshProfile.pfpUrl || fallbackPfpUrl,
      bio: freshProfile.bio || storedAccount?.bio || undefined,
      followerCount: freshProfile.followerCount,
      followingCount: freshProfile.followingCount,
    }),
    [fallbackDisplayName, fallbackPfpUrl, fallbackUsername, freshProfile, storedAccount?.bio]
  );
  const username = profile.username;
  const proofUsername = profile.proofUsername;
  const displayName = profile.displayName;
  const pfpUrl = profile.pfpUrl;
  const bio = profile.bio;
  const followerCount = profile.followerCount;
  const followingCount = profile.followingCount;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<FootyProfileUpdateEventDetail>).detail;
      if (!detail) {
        return;
      }

      if (detail.account) {
        setStoredAccount(detail.account);
      }

      if (detail.profile) {
        setFreshProfile((current) => ({
          ...current,
          ...detail.profile,
        }));
      }
    };

    window.addEventListener(FOOTY_FARCASTER_PROFILE_EVENT, handleProfileUpdate as EventListener);
    return () => {
      window.removeEventListener(FOOTY_FARCASTER_PROFILE_EVENT, handleProfileUpdate as EventListener);
    };
  }, []);

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
            ...(await (async () => {
              const [userDataMessages, verificationMessages, usernameProofs] = await Promise.all([
                fetchUserDataMessagesByFid(activeFid),
                fetchVerificationMessagesByFid(activeFid),
                fetchUsernameProofsByFid(activeFid),
              ]);
              const patch = deriveHubProfilePatch(userDataMessages, verificationMessages, usernameProofs);
              return {
                username: normalizeFarcasterUsername(patch.username || userProfile?.username),
                proofUsername: normalizeFarcasterUsername(patch.proofUsername),
                displayName: normalizeDisplayName(patch.displayName || userProfile?.display_name || userProfile?.displayName),
                pfpUrl: normalizeDisplayName(patch.pfpUrl || userProfile?.pfp_url),
                bio: normalizeDisplayName(patch.bio || userProfile?.profile?.bio?.text),
                verifications: patch.verifications,
                followerCount: typeof userProfile?.follower_count === 'number' ? userProfile.follower_count : undefined,
                followingCount: typeof userProfile?.following_count === 'number' ? userProfile.following_count : undefined,
              };
            })()),
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

  const refreshManagedProfile = useCallback(async () => {
    const headers = await getAuthorizationHeaders();
    let nextAccount: StoredFootyAccount | null = null;
    let nextProfile: Partial<FootyFarcasterProfile> & { bio?: string } = {};

    if (authenticated && user?.id) {
      const accountResponse = await fetch('/api/farcaster/account/me', {
        headers,
        cache: 'no-store',
      });
      const accountPayload = (await accountResponse.json().catch(() => ({}))) as { account?: StoredFootyAccount | null };
      nextAccount = accountPayload.account || null;
      setStoredAccount(nextAccount);
      nextProfile.bio = nextAccount?.bio || undefined;
    }

    if (activeFid) {
      try {
        const userProfile = await fetchUserByFid(activeFid);
        const [userDataMessages, verificationMessages, usernameProofs] = await Promise.all([
          fetchUserDataMessagesByFid(activeFid),
          fetchVerificationMessagesByFid(activeFid),
          fetchUsernameProofsByFid(activeFid),
        ]);
        const patch = deriveHubProfilePatch(userDataMessages, verificationMessages, usernameProofs);
        nextProfile = {
          username: normalizeFarcasterUsername(patch.username || userProfile?.username),
          proofUsername: normalizeFarcasterUsername(patch.proofUsername),
          displayName: normalizeDisplayName(patch.displayName || userProfile?.display_name || userProfile?.displayName),
          pfpUrl: normalizeDisplayName(patch.pfpUrl || userProfile?.pfp_url),
          bio: normalizeDisplayName(patch.bio || userProfile?.profile?.bio?.text) || nextProfile.bio,
          verifications: patch.verifications,
          followerCount: typeof userProfile?.follower_count === 'number' ? userProfile.follower_count : undefined,
          followingCount: typeof userProfile?.following_count === 'number' ? userProfile.following_count : undefined,
        };
        setFreshProfile(nextProfile);
      } catch (error) {
        console.warn('Footy Farcaster profile refresh skipped:', error);
      }
    }

    dispatchProfileUpdate({
      account: nextAccount,
      profile: nextProfile,
    });
  }, [activeFid, authenticated, getAuthorizationHeaders, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadStoredAccount = async () => {
      if (!authenticated || !user?.id) {
        if (!cancelled) {
          setStoredAccount(null);
          setHasLoadedStoredAccount(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setHasLoadedStoredAccount(false);
        }
        const headers = await getAuthorizationHeaders();
        const response = await fetch('/api/farcaster/account/me', {
          headers,
          cache: 'no-store',
        });

        const payload = (await response.json().catch(() => ({}))) as { account?: StoredFootyAccount | null };
        if (!cancelled) {
          setStoredAccount(payload.account || null);
          setHasLoadedStoredAccount(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Footy stored Farcaster account fetch skipped:', error);
          setStoredAccount(null);
          setHasLoadedStoredAccount(true);
        }
      }
    };

    void loadStoredAccount();

    return () => {
      cancelled = true;
    };
  }, [authenticated, getAuthorizationHeaders, user?.id]);

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
            signerPublicKey: effectiveSignerPublicKey || null,
            delegatedApp: 'footy',
            signerStatus,
            signerProvider: runtime === 'miniapp' ? 'miniapp' : (storedAccount?.signerProvider || 'privy'),
            signerCustody: runtime === 'miniapp' ? 'miniapp-hosted' : (storedAccount?.signerCustody || 'client-delegated'),
            walletProvider: runtime === 'miniapp' ? 'miniapp' : (storedAccount?.walletProvider || 'privy'),
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
  }, [activeFid, authenticated, displayName, effectiveSignerPublicKey, getAuthorizationHeaders, hasFarcaster, ready, runtime, signerStatus, storedAccount?.signerCustody, storedAccount?.signerProvider, storedAccount?.walletProvider, username]);

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

  const beginEmailLogin = useCallback(async () => {
    if (authenticated) {
      return;
    }

    login({ loginMethods: ['email'] });
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

  const beginCreateFarcasterAccount = useCallback(async () => {
    setOnboardingError(undefined);
    setShouldProvisionFarcasterAccount(true);

    if (!authenticated) {
      await beginEmailLogin();
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

    const walletAddress = user.wallet.address;
    if (!isAddress(walletAddress)) {
      throw new Error('A valid embedded wallet is required');
    }

    const embeddedWallet = wallets.find((wallet) => normalizeAddress(wallet.address) === normalizeAddress(walletAddress));
    if (!embeddedWallet) {
      throw new Error('Footy could not access the embedded wallet for Farcaster setup');
    }

    setIsCreatingFarcasterAccount(true);
    try {
      const configResponse = await fetch('/api/farcaster/onboarding/config', {
        method: 'GET',
        cache: 'no-store',
      });
      const configPayload = (await configResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        missing?: string[];
      };
      if (!configResponse.ok || !configPayload.ok) {
        const missing = Array.isArray(configPayload.missing) ? configPayload.missing : [];
        throw new Error(
          missing.length > 0
            ? `Footy Farcaster onboarding is not configured yet. Missing: ${missing.join(', ')}`
            : 'Footy Farcaster onboarding is not configured yet.'
        );
      }

      const checkResponse = await fetch('/api/farcaster/check-fid', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      });
      const checkPayload = (await checkResponse.json().catch(() => ({}))) as { fid?: number | null; error?: string };
      if (!checkResponse.ok) {
        throw new Error(checkPayload.error || 'Failed to check for an existing Farcaster account');
      }

      await embeddedWallet.switchChain(optimism.id);
      const provider = await embeddedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: optimism,
        transport: custom(provider),
      });
      const signer = new ViemWalletEip712Signer(walletClient);

      if (checkPayload.fid) {
        const headers = await getAuthorizationHeaders();
        const prepareSignerResponse = await fetch('/api/farcaster/signer/prepare', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            fid: checkPayload.fid,
            walletAddress,
          }),
        });
        const prepareSignerPayload = (await prepareSignerResponse.json().catch(() => ({}))) as {
          requestId?: string;
          addRequest?: { owner: `0x${string}`; keyType: number; key: `0x${string}`; metadataType: number; metadata: `0x${string}`; nonce: string; deadline: string };
          error?: string;
        };
        if (!prepareSignerResponse.ok || !prepareSignerPayload.requestId || !prepareSignerPayload.addRequest) {
          throw new Error(prepareSignerPayload.error || 'Failed to prepare a Footy signer for the existing Farcaster account');
        }

        const addSignatureResult = await signer.signAdd({
          owner: prepareSignerPayload.addRequest.owner,
          keyType: prepareSignerPayload.addRequest.keyType,
          key: hexToBytes(prepareSignerPayload.addRequest.key),
          metadataType: prepareSignerPayload.addRequest.metadataType,
          metadata: prepareSignerPayload.addRequest.metadata,
          nonce: BigInt(prepareSignerPayload.addRequest.nonce),
          deadline: BigInt(prepareSignerPayload.addRequest.deadline),
        });
        if (addSignatureResult.isErr()) {
          throw addSignatureResult.error;
        }

        const finalizeSignerResponse = await fetch('/api/farcaster/signer/finalize', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            requestId: prepareSignerPayload.requestId,
            addSignature: bytesToHex(addSignatureResult.value),
          }),
        });
        const finalizeSignerPayload = (await finalizeSignerResponse.json().catch(() => ({}))) as {
          account?: StoredFootyAccount;
          error?: string;
        };
        if (!finalizeSignerResponse.ok) {
          throw new Error(finalizeSignerPayload.error || 'Failed to finalize the Footy signer for the existing Farcaster account');
        }

        setStoredAccount(finalizeSignerPayload.account || null);
        setShouldProvisionFarcasterAccount(false);
        return;
      }

      const headers = await getAuthorizationHeaders();
      const prepareResponse = await fetch('/api/farcaster/prepare-registration', {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      const preparePayload = (await prepareResponse.json().catch(() => ({}))) as {
        existing?: boolean;
        fid?: number;
        requestId?: string;
        bundlerAddress?: `0x${string}`;
        extraStorage?: string;
        price?: string;
        signerPublicKey?: `0x${string}`;
        registerRequest?: { to: `0x${string}`; recovery: `0x${string}`; nonce: string; deadline: string };
        addRequest?: { owner: `0x${string}`; keyType: number; key: `0x${string}`; metadataType: number; metadata: `0x${string}`; nonce: string; deadline: string };
        error?: string;
      };
      if (!prepareResponse.ok) {
        throw new Error(preparePayload.error || 'Failed to prepare a Farcaster account');
      }

      if (preparePayload.existing && preparePayload.fid) {
        setStoredAccount((current) => ({
          ...current,
          fid: preparePayload.fid as number,
          custodyAddress: normalizeAddress(walletAddress) || walletAddress,
        }));
        setShouldProvisionFarcasterAccount(false);
        return;
      }

      if (!preparePayload.requestId || !preparePayload.registerRequest || !preparePayload.addRequest || !preparePayload.price) {
        throw new Error('Farcaster registration payload was incomplete');
      }

      const registerSignatureResult = await signer.signRegister({
        to: preparePayload.registerRequest.to,
        recovery: preparePayload.registerRequest.recovery,
        nonce: BigInt(preparePayload.registerRequest.nonce),
        deadline: BigInt(preparePayload.registerRequest.deadline),
      });
      if (registerSignatureResult.isErr()) {
        throw registerSignatureResult.error;
      }

      const addSignatureResult = await signer.signAdd({
        owner: preparePayload.addRequest.owner,
        keyType: preparePayload.addRequest.keyType,
        key: hexToBytes(preparePayload.addRequest.key),
        metadataType: preparePayload.addRequest.metadataType,
        metadata: preparePayload.addRequest.metadata,
        nonce: BigInt(preparePayload.addRequest.nonce),
        deadline: BigInt(preparePayload.addRequest.deadline),
      });
      if (addSignatureResult.isErr()) {
        throw addSignatureResult.error;
      }

      const finalizeResponse = await fetch('/api/farcaster/submit-registration', {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          requestId: preparePayload.requestId,
          registerSignature: bytesToHex(registerSignatureResult.value),
          addSignature: bytesToHex(addSignatureResult.value),
        }),
      });
      const finalizePayload = (await finalizeResponse.json().catch(() => ({}))) as {
        fid?: number;
        account?: StoredFootyAccount;
        error?: string;
      };
      if (!finalizeResponse.ok) {
        throw new Error(finalizePayload.error || 'Failed to finalize the new Farcaster account');
      }

      setStoredAccount(finalizePayload.account || null);
      setShouldProvisionFarcasterAccount(false);
      setOnboardingError(undefined);
    } finally {
      setIsCreatingFarcasterAccount(false);
    }
  }, [
    authenticated,
    beginEmailLogin,
    beginCreateWallet,
    beginLinkEmail,
    beginPrivyLogin,
    getAuthorizationHeaders,
    user?.email?.address,
    user?.wallet?.address,
    wallets,
  ]);

  useEffect(() => {
    if (!shouldProvisionFarcasterAccount || isCreatingFarcasterAccount || !ready || !authenticated) {
      return;
    }

    void beginCreateFarcasterAccount().catch((error) => {
      console.warn('Footy Farcaster account provisioning paused:', error);
      setOnboardingError(error instanceof Error ? error.message : 'Footy Farcaster provisioning failed');
      setShouldProvisionFarcasterAccount(false);
    });
  }, [authenticated, beginCreateFarcasterAccount, isCreatingFarcasterAccount, ready, shouldProvisionFarcasterAccount]);

  const updateManagedProfile = useCallback(async (input: { username?: string; displayName?: string; pfpUrl?: string; bio?: string }) => {
    const headers = await getAuthorizationHeaders();
    const response = await fetch('/api/farcaster/profile', {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      account?: StoredFootyAccount;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update your Footy profile');
    }

    setStoredAccount(payload.account || null);
    const optimisticProfile = {
      username: input.username,
      displayName: input.displayName,
      pfpUrl: input.pfpUrl,
      bio: input.bio,
    };
    setFreshProfile((current) => ({
      ...current,
      username: input.username || current.username,
      displayName: input.displayName || current.displayName,
      pfpUrl: input.pfpUrl || current.pfpUrl,
      bio: input.bio || current.bio,
    }));
    dispatchProfileUpdate({
      account: payload.account || null,
      profile: optimisticProfile,
    });
    await refreshManagedProfile();
  }, [getAuthorizationHeaders, refreshManagedProfile]);

  const claimManagedUsername = useCallback(async (nextUsername: string) => {
    if (!authenticated || !user?.wallet?.address) {
      throw new Error('Sign in with an embedded wallet to claim a username');
    }

    const walletAddress = user.wallet.address;
    if (!isAddress(walletAddress)) {
      throw new Error('A valid embedded wallet is required');
    }

    const embeddedWallet = wallets.find((wallet) => normalizeAddress(wallet.address) === normalizeAddress(walletAddress));
    if (!embeddedWallet) {
      throw new Error('Footy could not access the embedded wallet for username claiming');
    }

    await embeddedWallet.switchChain(optimism.id);
    const provider = await embeddedWallet.getEthereumProvider();
    const walletClient = createWalletClient({
      account: walletAddress as `0x${string}`,
      chain: optimism,
      transport: custom(provider),
    });
    const signer = new ViemWalletEip712Signer(walletClient);
    const timestamp = Math.floor(Date.now() / 1000);
    const claim = makeUserNameProofClaim({
      name: nextUsername,
      owner: walletAddress,
      timestamp,
    });
    const signatureResult = await signer.signUserNameProofClaim(claim);
    if (signatureResult.isErr()) {
      throw signatureResult.error;
    }

    const headers = await getAuthorizationHeaders();
    const response = await fetch('/api/farcaster/profile/claim-username', {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        username: nextUsername,
        owner: walletAddress,
        timestamp,
        signature: bytesToHex(signatureResult.value),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      account?: StoredFootyAccount;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to claim your Farcaster username');
    }

    setStoredAccount(payload.account || null);
    dispatchProfileUpdate({
      account: payload.account || null,
    });
    await refreshManagedProfile();
  }, [authenticated, getAuthorizationHeaders, refreshManagedProfile, user?.wallet?.address, wallets]);

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
      if (hasStoredFarcaster) {
        return;
      }

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
    hasStoredFarcaster,
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

      if (linkedFid && signerPublicKey) {
        const signer = new ExternalEd25519Signer(signFarcasterMessage, getFarcasterSignerPublicKey);
        const body = CastAddBody.create({
          text,
          parentUrl: FOOTBALL_PARENT_URL,
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
      }

      if (storedAccount?.fid && storedAccount?.signerPublicKey) {
        return {
          fid: storedAccount.fid,
          text,
          embeds,
        } satisfies FootySignedCastPayload;
      }

      throw new Error('Connect or create a Farcaster account before posting');
    },
    [getFarcasterSignerPublicKey, linkedFid, signFarcasterMessage, signerPublicKey, storedAccount?.fid, storedAccount?.signerPublicKey]
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
          embeds: payload.embeds,
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
    isHydratingAccount,
    canWrite,
    onboardingState,
    profile,
    fid: activeFid,
    username,
    proofUsername,
    displayName,
    pfpUrl,
    bio,
    followerCount,
    followingCount,
    signerPublicKey: effectiveSignerPublicKey,
    hasFarcaster,
    hasWalletSigner,
    hasSigner,
    delegatedApp: 'footy',
    signerStatus,
    signerProvider: runtime === 'miniapp' ? 'miniapp' : (storedAccount?.signerProvider || 'privy'),
    signerCustody: runtime === 'miniapp' ? 'miniapp-hosted' : (storedAccount?.signerCustody || 'client-delegated'),
    walletProvider: runtime === 'miniapp' ? 'miniapp' : (storedAccount?.walletProvider || 'privy'),
    isProvisioningFarcasterAccount,
    onboardingError,
    beginLogin,
    beginPrivyLogin,
    beginLinkEmail,
    beginCreateWallet,
    beginLinkFarcaster,
    beginCreateFarcasterAccount,
    beginSignerAuthorization,
    advanceOnboarding,
    requestSigner,
    updateManagedProfile,
    claimManagedUsername,
    signCast,
    submitSignedMessage,
    getAuthorizationHeaders,
  };
}
