/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { sdk } from "@farcaster/miniapp-sdk";
import { LockKeyhole } from 'lucide-react';
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
  const { totalPoints, entryName } = entry;
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
    <tr
      className={`border-b border-limeGreenOpacity transition-colors text-lightPurple text-sm ${
        isUserRow
          ? 'bg-limeGreenOpacity/20 border-limeGreenOpacity/50 font-bold' // Highlight user's row
          : 'hover:bg-purplePanel'
      }`}>
      <td className="py-2 px-2 text-center text-lightPurple font-bold">
        {entry.rank ?? 'N/A'}
      </td>
      <td className="px-1 py-2 text-center">
        {claim && claimantPfpUrl && (
          <button type="button" onClick={openClaimantProfile} className="inline-flex rounded-full hover:opacity-80" title="Open claimant’s Farcaster profile" aria-label="Open claimant’s Farcaster profile">
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
      </td>
      <td className="py-2 px-2 text-lightPurple font-medium text-left">
        {entryName}
      </td>
      <td className="py-2 px-2 text-center text-lightPurple">
        {totalPoints ?? 'N/A'}
      </td>
      <td className="w-12 px-1 py-2 text-center">
        {claim ? (
          currentUserFid === claim.fid ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); onReleaseClick(entry, claim); }} className="inline-flex rounded p-1 text-red-300 hover:bg-red-300/10" title="Release claim" aria-label="Release claim">
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
            className="rounded border border-limeGreen px-2 py-1 text-xs font-semibold text-limeGreen hover:bg-limeGreen hover:text-darkPurple"
          >
            Claim
          </button>
        )}
      </td>
    </tr>
  );
};

export default FantasyRow;
