'use client';

/**
 * useFarcasterActions
 *
 * Global hook for write operations on the Farcaster protocol:
 *   likeCast(castHash, castAuthorFid)    – ReactionType.LIKE
 *   unlikeCast(castHash, castAuthorFid)  – remove the LIKE reaction
 *   recastCast(castHash, castAuthorFid)  – ReactionType.RECAST
 *   unrecastCast(castHash, castAuthorFid)
 *
 * Signing strategy (mirrors signCast in useFootyFarcaster):
 *   1. Privy-linked FID + signerPublicKey → ExternalEd25519Signer
 *   2. Miniapp runtime → sdk.actions.composeCast is not applicable for reactions,
 *      so we fall through to the Privy path. Both runtimes use the same signer.
 *
 * Optimistic state: `likedHashes` and `recastedHashes` are Sets updated
 * immediately on the client so the UI feels instant.
 *
 * Submission: signed messages are POSTed to /api/farcaster/reaction which
 * proxies to the hub via submitSignedFarcasterMessage.
 */

import { useCallback, useState } from 'react';
import { ExternalEd25519Signer } from '@standard-crypto/farcaster-js';
import { FarcasterNetwork, makeReactionAdd, makeReactionRemove, ReactionType } from '@farcaster/hub-web';
import { hexToBytes } from 'viem';
import { useFarcasterSigner, usePrivy } from '@privy-io/react-auth';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ReactionKind = 'like' | 'recast';

export type FarcasterActionsState = {
  /** Set of cast hashes the current user has liked (optimistic) */
  likedHashes: Set<string>;
  /** Set of cast hashes the current user has recasted (optimistic) */
  recastedHashes: Set<string>;
  /** True while any reaction request is in-flight */
  isPending: boolean;
  /** Last error message, if any */
  error: string | null;

  likeCast: (castHash: string, castAuthorFid: number) => Promise<void>;
  unlikeCast: (castHash: string, castAuthorFid: number) => Promise<void>;
  recastCast: (castHash: string, castAuthorFid: number) => Promise<void>;
  unrecastCast: (castHash: string, castAuthorFid: number) => Promise<void>;
  /** Toggle like — likes if not liked, unlikes if already liked */
  toggleLike: (castHash: string, castAuthorFid: number) => Promise<void>;
  /** Toggle recast */
  toggleRecast: (castHash: string, castAuthorFid: number) => Promise<void>;
};

// ─── Normalise cast hash ───────────────────────────────────────────────────────

function normHash(hash: string): string {
  return hash.startsWith('0x') ? hash : `0x${hash}`;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useFarcasterActions(): FarcasterActionsState {
  const { user } = usePrivy();
  const { signFarcasterMessage, getFarcasterSignerPublicKey } = useFarcasterSigner();

  const [likedHashes, setLikedHashes] = useState<Set<string>>(new Set());
  const [recastedHashes, setRecastedHashes] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Resolve the active Farcaster FID from Privy linked accounts ──────────────
  const getLinkedFid = useCallback((): number | null => {
    const farcasterAccount = user?.linkedAccounts?.find(
      (a) => (a as { type?: string }).type === 'farcaster'
    ) as { fid?: number } | undefined;
    return farcasterAccount?.fid ?? null;
  }, [user]);

  // ── Build signer (same as signCast) ──────────────────────────────────────────
  const buildSigner = useCallback((): ExternalEd25519Signer | null => {
    try {
      return new ExternalEd25519Signer(signFarcasterMessage, getFarcasterSignerPublicKey);
    } catch {
      return null;
    }
  }, [signFarcasterMessage, getFarcasterSignerPublicKey]);

  // ── Core reaction function ────────────────────────────────────────────────────
  const sendReaction = useCallback(
    async (
      castHash: string,
      castAuthorFid: number,
      reactionType: ReactionType,
      remove: boolean
    ): Promise<void> => {
      const fid = getLinkedFid();
      if (!fid) throw new Error('Connect a Farcaster account to react to casts');

      const signer = buildSigner();
      if (!signer) throw new Error('No Farcaster signer available');

      const hash = normHash(castHash);
      const targetCastId = {
        fid: castAuthorFid,
        hash: hexToBytes(hash as `0x${string}`),
      };

      const dataOptions = { fid, network: FarcasterNetwork.MAINNET };

      const messageResult = remove
        ? await makeReactionRemove({ type: reactionType, targetCastId }, dataOptions, signer)
        : await makeReactionAdd({ type: reactionType, targetCastId }, dataOptions, signer);

      if (messageResult.isErr()) {
        throw messageResult.error;
      }

      // POST the signed message to our server proxy
      const response = await fetch('/api/farcaster/reaction', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fid, message: messageResult.value }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Reaction failed (${response.status})`);
      }
    },
    [buildSigner, getLinkedFid]
  );

  // ── Public action wrappers ────────────────────────────────────────────────────

  const withOptimistic = useCallback(
    async (
      castHash: string,
      set: React.Dispatch<React.SetStateAction<Set<string>>>,
      add: boolean,
      action: () => Promise<void>
    ) => {
      const key = normHash(castHash);
      setError(null);
      setIsPending(true);

      // Optimistic update
      set((prev) => {
        const next = new Set(prev);
        if (add) next.add(key);
        else next.delete(key);
        return next;
      });

      try {
        await action();
      } catch (err) {
        // Rollback on failure
        set((prev) => {
          const next = new Set(prev);
          if (add) next.delete(key);
          else next.add(key);
          return next;
        });
        const msg = err instanceof Error ? err.message : 'Reaction failed';
        setError(msg);
        console.error('[farcasterActions]', msg);
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const likeCast = useCallback(
    (castHash: string, castAuthorFid: number) =>
      withOptimistic(castHash, setLikedHashes, true, () =>
        sendReaction(castHash, castAuthorFid, ReactionType.LIKE, false)
      ),
    [sendReaction, withOptimistic]
  );

  const unlikeCast = useCallback(
    (castHash: string, castAuthorFid: number) =>
      withOptimistic(castHash, setLikedHashes, false, () =>
        sendReaction(castHash, castAuthorFid, ReactionType.LIKE, true)
      ),
    [sendReaction, withOptimistic]
  );

  const recastCast = useCallback(
    (castHash: string, castAuthorFid: number) =>
      withOptimistic(castHash, setRecastedHashes, true, () =>
        sendReaction(castHash, castAuthorFid, ReactionType.RECAST, false)
      ),
    [sendReaction, withOptimistic]
  );

  const unrecastCast = useCallback(
    (castHash: string, castAuthorFid: number) =>
      withOptimistic(castHash, setRecastedHashes, false, () =>
        sendReaction(castHash, castAuthorFid, ReactionType.RECAST, true)
      ),
    [sendReaction, withOptimistic]
  );

  const toggleLike = useCallback(
    (castHash: string, castAuthorFid: number) => {
      const key = normHash(castHash);
      return likedHashes.has(key)
        ? unlikeCast(castHash, castAuthorFid)
        : likeCast(castHash, castAuthorFid);
    },
    [likedHashes, likeCast, unlikeCast]
  );

  const toggleRecast = useCallback(
    (castHash: string, castAuthorFid: number) => {
      const key = normHash(castHash);
      return recastedHashes.has(key)
        ? unrecastCast(castHash, castAuthorFid)
        : recastCast(castHash, castAuthorFid);
    },
    [recastedHashes, recastCast, unrecastCast]
  );

  return {
    likedHashes,
    recastedHashes,
    isPending,
    error,
    likeCast,
    unlikeCast,
    recastCast,
    unrecastCast,
    toggleLike,
    toggleRecast,
  };
}
