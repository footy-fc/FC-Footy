/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { sdk } from "@farcaster/miniapp-sdk";
import { FantasyEntry } from './utils/fetchFantasyData';
import { fetchUsersByFids } from '~/lib/hypersnap';
import type { FplClaimSummary } from '~/lib/fplClaimConstants';
// import { BASE_URL } from '~/lib/config';


interface FantasyRowProps {
  entry: FantasyEntry;  // Consistent FantasyEntry type
  onRowClick: (entry: FantasyEntry) => void;
  onClaimClick: (entry: FantasyEntry) => void;
  onReleaseClick: (entry: FantasyEntry, claim: FplClaimSummary) => void;
  claim?: FplClaimSummary | null;
  claimDisabled?: boolean;
  currentUserFid?: number | null;  // Add currentUserFid for highlighting
}

const FantasyRow: React.FC<FantasyRowProps> = ({ entry, onRowClick, onClaimClick, onReleaseClick, claim = null, claimDisabled = false, currentUserFid }) => {
  const { totalPoints, team, entryName } = entry;
  const [pfpUrl, setPfpUrl] = useState<string>('/defifa_spinner.gif');
  const [claimant, setClaimant] = useState<{ username?: string; pfpUrl: string }>({ pfpUrl: '/defifa_spinner.gif' });

  useEffect(() => {
    const fetchPfp = async () => {
      if (!entry.fid) {
        setPfpUrl('/defifa_spinner.gif');
        return;
      }

      try {
        const users = await fetchUsersByFids([entry.fid]);
        const pfp = users[0]?.pfp_url;
        if (pfp) {
          setPfpUrl(pfp);
        } else {
          setPfpUrl('/defifa_spinner.gif');
        }
      } catch (error) {
        console.error('Error fetching PFP for FID:', entry.fid, error);
        setPfpUrl('/defifa_spinner.gif');
      }
    };

    fetchPfp();
  }, [entry.fid, entry.entry_id]);

  useEffect(() => {
    let cancelled = false;
    if (!claim?.fid) {
      setClaimant({ pfpUrl: '/defifa_spinner.gif' });
      return;
    }
    void fetchUsersByFids([claim.fid])
      .then((users) => {
        if (cancelled) return;
        setClaimant({ username: users[0]?.username, pfpUrl: users[0]?.pfp_url || '/defifa_spinner.gif' });
      })
      .catch(() => {
        if (!cancelled) setClaimant({ pfpUrl: '/defifa_spinner.gif' });
      });
    return () => {
      cancelled = true;
    };
  }, [claim?.fid]);

  // Check if this is the user's own row
  const isUserRow = currentUserFid && entry.fid === currentUserFid;
  
  // Handler for PFP click to open user profile
  const handlePfpClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
    
    if (!entry.fid) return;
    
    try {
      await sdk.actions.ready();
      await sdk.actions.viewProfile({ fid: entry.fid });
    } catch (error) {
      console.error('Failed to open profile:', error);
      // Fail silently - no error logging or fallback
    }
  };

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
          : 'hover:bg-purplePanel cursor-pointer'
      }`}
      onClick={() => onRowClick(entry)}>
      <td className="py-2 px-2 text-center text-lightPurple font-bold">
        {entry.rank ?? 'N/A'}
      </td>
      <td className="py-2 px-2 flex items-center space-x-2">
        <Image
          src={pfpUrl}
          alt="Manager Avatar"
          className="rounded-full w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity"
          width={32}
          height={32}
          onClick={handlePfpClick}
          onError={() => setPfpUrl('/defifa_spinner.gif')}
          title={`Click to view ${entryName}'s profile`}
        />
        {team?.logo && team.logo !== '/defifa_spinner.gif' && (
          <Image
            src={team.logo || '/default-team-logo.png'}
            alt="Team Logo"
            className="rounded-full object-cover"
            width={24}
            height={24}
            loading="lazy"
          />
        )}
      </td>
      <td className="py-2 px-2 text-lightPurple font-medium text-left">
        {entryName}
      </td>
      <td className="py-2 px-2 text-center text-lightPurple">
        {totalPoints ?? 'N/A'}
      </td>
      <td className="py-2 px-2 text-center">
        {claim ? (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={openClaimantProfile} className="flex items-center gap-1.5 rounded px-1 py-1 text-xs text-limeGreen hover:bg-limeGreen/10" title="Open claimant's Farcaster profile">
              <Image src={claimant.pfpUrl} alt="Claimant Farcaster profile" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
              <span>{claimant.username ? `@${claimant.username}` : `FID ${claim.fid}`}</span>
            </button>
            {currentUserFid === claim.fid && (
              <button type="button" onClick={(event) => { event.stopPropagation(); onReleaseClick(entry, claim); }} className="text-[11px] text-red-300 underline-offset-2 hover:underline">Release</button>
            )}
            {currentUserFid !== claim.fid && <span className="text-[10px] text-lightPurple/60">Wrong claim? Tap profile</span>}
          </div>
        ) : claimDisabled ? (
          <span className="text-xs text-lightPurple/60">Locked</span>
        ) : (
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
