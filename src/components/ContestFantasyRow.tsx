/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { sdk } from "@farcaster/miniapp-sdk";
import { FantasyEntry } from './utils/fetchFantasyData';
import { fetchUsersByFids } from '~/lib/hypersnap';
// import { BASE_URL } from '~/lib/config';


interface FantasyRowProps {
  entry: FantasyEntry;  // Consistent FantasyEntry type
  onRowClick: (entry: FantasyEntry) => void;
  currentUserFid?: number | null;  // Add currentUserFid for highlighting
}

const FantasyRow: React.FC<FantasyRowProps> = ({ entry, onRowClick, currentUserFid }) => {
  const { totalPoints, team, entryName } = entry;
  const [pfpUrl, setPfpUrl] = useState<string>('/defifa_spinner.gif');
  const [isLoadingPfp, setIsLoadingPfp] = useState(false);

  useEffect(() => {
    const fetchPfp = async () => {
      if (!entry.fid) {
        setPfpUrl('/defifa_spinner.gif');
        return;
      }

      setIsLoadingPfp(true);
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
      } finally {
        setIsLoadingPfp(false);
      }
    };

    fetchPfp();
  }, [entry.fid, entry.entry_id]);

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
    </tr>
  );
};

export default FantasyRow;
