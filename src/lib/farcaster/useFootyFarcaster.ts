'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useFarcasterSigner, useLinkAccount, usePrivy } from '@privy-io/react-auth';
import { ExternalEd25519Signer } from '@standard-crypto/farcaster-js';
import { CastAddBody, FarcasterNetwork, makeCastAdd } from '@farcaster/hub-web';
import { detectFarcasterRuntime, type FarcasterRuntime } from '~/lib/farcaster/runtime';
import type { FootyDelegatedApp, FootySignerCustody, FootySignerProvider, FootySignerStatus, FootyWalletProvider } from '~/lib/farcaster/types';

type FootyCastInput = {
  text: string;
  embeds?: string[];
};

type FootySignedCastPayload = {
  fid: number;
  text: string;
  embeds?: string[];
  message: unknown;
};

export type FootyFarcasterState = {
  runtime: 'miniapp' | 'standalone';
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  signerPublicKey?: string;
  hasFarcaster: boolean;
  hasWalletSigner: boolean;
  hasSigner: boolean;
  delegatedApp: FootyDelegatedApp;
  signerStatus: FootySignerStatus;
  signerProvider?: FootySignerProvider;
  signerCustody?: FootySignerCustody;
  walletProvider?: FootyWalletProvider;
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

export function useFootyFarcaster(): FootyFarcasterState {
  const initialRuntime = useMemo(() => detectFarcasterRuntime(), []);
  const [runtime, setRuntime] = useState<FarcasterRuntime>(initialRuntime);
  const [miniAppContext, setMiniAppContext] = useState<MiniAppContext | null>(null);
  const [isRequestingSigner, setIsRequestingSigner] = useState(false);
  const { ready, authenticated, user, login } = usePrivy();
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
  const fid = runtime === 'miniapp' ? miniAppContext?.user?.fid : privyFarcaster?.fid;
  const username =
    runtime === 'miniapp'
      ? normalizeDisplayName(miniAppContext?.user?.username)
      : normalizeDisplayName(privyFarcaster?.username);
  const displayName =
    runtime === 'miniapp'
      ? normalizeDisplayName(miniAppContext?.user?.displayName || miniAppContext?.user?.display_name)
      : normalizeDisplayName(privyFarcaster?.displayName || privyFarcaster?.display_name);
  const pfpUrl =
    runtime === 'miniapp'
      ? normalizeDisplayName(miniAppContext?.user?.pfpUrl || miniAppContext?.user?.pfp_url)
      : normalizeDisplayName(privyFarcaster?.pfpUrl || privyFarcaster?.pfp_url);
  const signerPublicKey = privyFarcaster?.signerPublicKey;

  const hasFarcaster = Boolean(fid);
  const hasWalletSigner = Boolean(authenticated);
  const hasSigner = Boolean(signerPublicKey);
  const signerStatus: FootySignerStatus = hasSigner ? 'authorized' : isRequestingSigner ? 'pending' : 'none';

  const getAuthorizationHeaders = useCallback(async (): Promise<FootyAuthHeaders> => {
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

    return {
      'x-footy-runtime': 'standalone',
      'x-footy-user-id': `privy:${user.id}`,
      ...(fid ? { 'x-footy-fid': String(fid) } : {}),
    };
  }, [fid, runtime, user?.id]);

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
            fid,
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
  }, [authenticated, displayName, fid, getAuthorizationHeaders, hasFarcaster, ready, runtime, signerPublicKey, signerStatus, username]);

  const requestSigner = useCallback(async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!privyFarcaster?.fid) {
      await linkFarcaster();
      return;
    }

    setIsRequestingSigner(true);
    try {
      await requestFarcasterSignerFromWarpcast();
    } finally {
      setIsRequestingSigner(false);
    }
  }, [authenticated, linkFarcaster, login, privyFarcaster?.fid, requestFarcasterSignerFromWarpcast]);

  const signCast = useCallback(
    async (input: string | FootyCastInput) => {
      const text = typeof input === 'string' ? input : input.text;
      const embeds = typeof input === 'string' ? [] : (input.embeds || []);

      if (!text.trim()) {
        throw new Error('Cast text is required');
      }

      if (!fid) {
        throw new Error('Connect Farcaster before posting');
      }

      if (!hasSigner) {
        throw new Error('Authorize Footy signer before posting');
      }

      const signer = new ExternalEd25519Signer(signFarcasterMessage, getFarcasterSignerPublicKey);
      const body = CastAddBody.create({
        text,
        embeds: embeds.map((url) => ({ url })),
        mentions: [],
        mentionsPositions: [],
      });
      const messageResult = await makeCastAdd(
        body,
        {
          fid,
          network: FarcasterNetwork.MAINNET,
        },
        signer
      );

      if (messageResult.isErr()) {
        throw messageResult.error;
      }

      return {
        fid,
        text,
        embeds,
        message: messageResult.value,
      } satisfies FootySignedCastPayload;
    },
    [fid, getFarcasterSignerPublicKey, hasSigner, signFarcasterMessage]
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
    fid,
    username,
    displayName,
    pfpUrl,
    signerPublicKey,
    hasFarcaster,
    hasWalletSigner,
    hasSigner,
    delegatedApp: 'footy',
    signerStatus,
    signerProvider: runtime === 'miniapp' ? 'miniapp' : 'privy',
    signerCustody: runtime === 'miniapp' ? 'miniapp-hosted' : 'client-delegated',
    walletProvider: runtime === 'miniapp' ? 'miniapp' : 'privy',
    requestSigner,
    signCast,
    submitSignedMessage,
  };
}
