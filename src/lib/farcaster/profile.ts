/**
 * Farcaster profile resolution utilities
 *
 * SERVER-SAFE (no React): resolveProfile, resolveUsername, resolveProfiles
 * CLIENT HOOK:            useFarcasterProfile, useFarcasterProfiles
 *
 * All reads go through the hypersnap node (NEXT_PUBLIC_FARCASTER_HTTP_API_URL).
 * Username lookup uses the Neynar-compatible /v2/farcaster/user/by_username endpoint.
 * Bulk FID lookup uses /v2/farcaster/user/bulk.
 *
 * Results are cached in a module-level Map for the lifetime of the page so
 * repeated renders don't re-fetch the same FID.
 */

import { fetchUserByFid, fetchUsersByFids, getHypersnapBaseUrl } from '~/lib/hypersnap';
import type { HypersnapUser } from '~/lib/hypersnap';

// ─── Public profile type ───────────────────────────────────────────────────────

export type FarcasterProfile = {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  /** Verified Ethereum addresses */
  verifications?: string[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function hypersnapUserToProfile(u: HypersnapUser): FarcasterProfile {
  return {
    fid: u.fid,
    username: u.username,
    displayName: u.display_name ?? u.displayName,
    pfpUrl: u.pfp_url,
    followerCount: u.follower_count,
    followingCount: u.following_count,
    verifications: u.verified_addresses?.eth_addresses ?? u.verifications,
    bio: u.profile?.bio?.text,
  };
}

// Simple module-level cache (survives re-renders, reset on full page load)
const profileCache = new Map<number, FarcasterProfile>();
const usernameCache = new Map<string, FarcasterProfile | null>();

// ─── Server-safe utilities ────────────────────────────────────────────────────

/**
 * Resolve a single Farcaster profile by FID.
 * Returns null if not found.
 */
export async function resolveProfile(fid: number): Promise<FarcasterProfile | null> {
  if (!Number.isFinite(fid) || fid <= 0) return null;

  if (profileCache.has(fid)) return profileCache.get(fid)!;

  const user = await fetchUserByFid(fid);
  if (!user) return null;

  const profile = hypersnapUserToProfile(user);
  profileCache.set(fid, profile);
  return profile;
}

/**
 * Resolve multiple profiles by FID in a single network request.
 * Returns a Map<fid, FarcasterProfile> — missing FIDs are omitted.
 */
export async function resolveProfiles(fids: number[]): Promise<Map<number, FarcasterProfile>> {
  const result = new Map<number, FarcasterProfile>();
  if (fids.length === 0) return result;

  const uncached: number[] = [];
  for (const fid of fids) {
    const cached = profileCache.get(fid);
    if (cached) {
      result.set(fid, cached);
    } else if (Number.isFinite(fid) && fid > 0) {
      uncached.push(fid);
    }
  }

  if (uncached.length > 0) {
    const users = await fetchUsersByFids(uncached);
    for (const u of users) {
      const profile = hypersnapUserToProfile(u);
      profileCache.set(u.fid, profile);
      result.set(u.fid, profile);
    }
  }

  return result;
}

/**
 * Resolve a Farcaster profile by username (without the leading @).
 * Returns null if not found.
 */
export async function resolveUsername(username: string): Promise<FarcasterProfile | null> {
  const normalized = username.replace(/^@/, '').toLowerCase().trim();
  if (!normalized) return null;

  if (usernameCache.has(normalized)) return usernameCache.get(normalized) ?? null;

  const base = getHypersnapBaseUrl();
  try {
    const url = new URL('/v2/farcaster/user/by_username', base);
    url.searchParams.set('username', normalized);

    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      usernameCache.set(normalized, null);
      return null;
    }

    const payload = (await res.json()) as { user?: HypersnapUser; result?: { user?: HypersnapUser } };
    const user = payload.user ?? payload.result?.user;

    if (!user?.fid) {
      usernameCache.set(normalized, null);
      return null;
    }

    const profile = hypersnapUserToProfile(user);
    profileCache.set(user.fid, profile);
    usernameCache.set(normalized, profile);
    return profile;
  } catch {
    usernameCache.set(normalized, null);
    return null;
  }
}

// ─── Client-side React hooks ──────────────────────────────────────────────────

// Only import React in a way that is tree-shaken server-side
import { useEffect, useState } from 'react';

export type ProfileState = {
  profile: FarcasterProfile | null;
  loading: boolean;
  error: string | null;
};

/**
 * React hook — resolves a single profile by FID.
 * Safe to call with undefined/null fid (returns loading=false, profile=null).
 */
export function useFarcasterProfile(fid: number | undefined | null): ProfileState {
  const [state, setState] = useState<ProfileState>({
    profile: fid ? (profileCache.get(fid) ?? null) : null,
    loading: Boolean(fid && !profileCache.has(fid)),
    error: null,
  });

  useEffect(() => {
    if (!fid) {
      setState({ profile: null, loading: false, error: null });
      return;
    }

    const cached = profileCache.get(fid);
    if (cached) {
      setState({ profile: cached, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    resolveProfile(fid)
      .then((profile) => {
        if (!cancelled) setState({ profile, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            profile: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load profile',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fid]);

  return state;
}

/**
 * React hook — resolves a profile by username (without @).
 */
export function useFarcasterProfileByUsername(username: string | undefined | null): ProfileState {
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: Boolean(username),
    error: null,
  });

  useEffect(() => {
    if (!username) {
      setState({ profile: null, loading: false, error: null });
      return;
    }

    const normalized = username.replace(/^@/, '').toLowerCase().trim();
    const cached = usernameCache.get(normalized);
    if (cached !== undefined) {
      setState({ profile: cached, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    resolveUsername(normalized)
      .then((profile) => {
        if (!cancelled) setState({ profile, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            profile: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to resolve username',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  return state;
}

/**
 * React hook — resolves multiple profiles by FID in one request.
 * Re-runs whenever the fids array reference changes (use useMemo for stability).
 */
export function useFarcasterProfiles(fids: number[]): {
  profiles: Map<number, FarcasterProfile>;
  loading: boolean;
  error: string | null;
} {
  const [profiles, setProfiles] = useState<Map<number, FarcasterProfile>>(new Map());
  const [loading, setLoading] = useState(fids.length > 0);
  const [error, setError] = useState<string | null>(null);

  // stable key to detect actual FID list changes without deep-equal
  const fidsKey = fids.slice().sort().join(',');

  useEffect(() => {
    if (fids.length === 0) {
      setProfiles(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    resolveProfiles(fids)
      .then((map) => {
        if (!cancelled) {
          setProfiles(map);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load profiles');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fidsKey]);

  return { profiles, loading, error };
}
