/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { sdk } from "@farcaster/miniapp-sdk";
import { LockKeyhole, UserRound } from 'lucide-react';
import { FantasyEntry } from './utils/fetchFantasyData';
import { fetchUsersByFids } from '~/lib/hypersnap';
import type { FplClaimSummary } from '~/lib/fplClaimConstants';
// import { BASE_URL } from '~/lib/config';


interface FantasyRowProps {
  entry: FantasyEntry;  // Consistent FantasyEntry type
  onClaimClick: (entry: FantasyEntry) => void;
  onReleaseClick: (entry: FantasyEntry, claim: FplClaimSummary) => void;
  claim?: FplClaimSummary | null;
  claimDisabled?: boolean;
  currentUserFid?: number | null;  // Add currentUserFid for highlighting
}

const FantasyRow: React.FC<FantasyRowProps> = ({ entry, onClaimClick, onReleaseClick, claim = null, claimDisabled = false, currentUserFid }) => {
  const { totalPoints, eventTotal, entryName, manager } = entry;
  const [claimantPfpUrl, setClaimantPfpUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!claim?.fid) {
      setClaimantPfpUrl(null);
      return;
    }
    void fetchUsersByFids([claim.fid])
      .then((users) => {
        if (cancelled) return;
        setClaimantPfpUrl(users[0]?.pfp_url || null);
      })
      .catch(() => {
        if (!cancelled) setClaimantPfpUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [claim?.fid]);

  // Check if this is the user's own row
  const isUserRow = Boolean(currentUserFid && claim?.fid === currentUserFid);

  const openClaimantProfile = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!claim?.fid) return;
    try {
      await sdk.actions.ready();
      await sdk.actions.viewProfile({ fid: claim.fid });
    } catch {
      try {
        await sdk.actions.openUrl(`https://warpcast.com/~/profiles/${claim.fid}`);
      } catch {}
    }
  };
  
  return (
    <article
      role="listitem"
      className={`grid min-h-[72px] grid-cols-[34px_minmax(0,1fr)_46px_52px_32px] items-center gap-2 rounded-[18px] border px-2 py-3 text-sm transition-colors ${
        isUserRow
          ? 'border-deepPink/35 bg-deepPink/10'
          : 'border-lightPurple/10 bg-darkPurple/55 hover:border-lightPurple/20'
      }`}>
      <div className={`text-center text-sm font-bold ${entry.rank <= 3 ? 'text-[#fea282]' : 'text-lightPurple'}`} aria-label={`Rank ${entry.rank}`}>
        {entry.rank ?? '—'}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {claim && claimantPfpUrl && (
          <button type="button" onClick={openClaimantProfile} className="inline-flex shrink-0 rounded-full hover:opacity-80" title="Open claimant’s Farcaster profile" aria-label="Open claimant’s Farcaster profile">
            <Image
              src={claimantPfpUrl}
              alt="Claimant Farcaster profile"
              className="h-8 w-8 rounded-full object-cover"
              width={32}
              height={32}
              onError={() => setClaimantPfpUrl(null)}
            />
          </button>
        )}
        {!claimantPfpUrl ? (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-lightPurple/10 bg-purplePanel/75 text-lightPurple/55" aria-hidden="true">
            <UserRound className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-5 text-notWhite">{entryName}</div>
          <div className="truncate text-[10px] leading-4 text-lightPurple/65">{manager || (claim ? `FID ${claim.fid}` : 'Unclaimed')}</div>
        </div>
      </div>
      <div className="text-right font-semibold tabular-nums text-lightPurple" aria-label={`${eventTotal ?? 0} gameweek points`}>
        {eventTotal ?? '—'}
      </div>
      <div className="text-right font-bold tabular-nums text-notWhite" aria-label={`${totalPoints ?? 0} total points`}>
        {totalPoints ?? '—'}
      </div>
      <div className="text-right">
        {claim ? (
          currentUserFid === claim.fid ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); onReleaseClick(entry, claim); }} className="inline-flex rounded-full p-1.5 text-deepPink hover:bg-deepPink/10" title="Release claim" aria-label={`Release ${entryName}`}>
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null
        ) : claimDisabled ? null : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClaimClick(entry);
            }}
            className="rounded-full border border-deepPink/30 px-2 py-1 text-[10px] font-semibold text-deepPink transition-colors hover:bg-deepPink/10"
            aria-label={`Claim ${entryName}`}
          >
            Claim
          </button>
        )}
      </div>
    </article>
  );
};

export default FantasyRow;
