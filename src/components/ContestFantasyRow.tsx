/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
// import { sdk as frameSdk } from "@farcaster/miniapp-sdk";
import { FantasyEntry } from './utils/fetchFantasyData';
// import { BASE_URL } from '~/lib/config';


interface FantasyRowProps {
  entry: FantasyEntry;  // Consistent FantasyEntry type
  onRowClick: (entry: FantasyEntry) => void;
  currentUserEntry?: FantasyEntry | null;  // Add currentUserEntry prop
  currentUserFid?: number | null;  // Add currentUserFid for highlighting
}

const FantasyRow: React.FC<FantasyRowProps> = ({ entry, onRowClick, currentUserEntry, currentUserFid }) => {
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
        // Fetch Farcaster profile data
        const response = await fetch(`https://hub.merv.fun/v1/userDataByFid?fid=${entry.fid}`);
        const data = await response.json();
        
        // Look for PFP in the user data
        const messages = data.messages || [];
        let pfpFound = false;
        
        for (const message of messages) {
          if (message.data?.userDataBody?.type === 'USER_DATA_TYPE_PFP') {
            const pfp = message.data.userDataBody.value;
            if (pfp && pfp !== '/defifa_spinner.gif') {
              setPfpUrl(pfp);
              pfpFound = true;
              break;
            }
          }
        }
        
        if (!pfpFound) {
          setPfpUrl('/defifa_spinner.gif');
        }
      } catch (error) {
        console.error('Error fetching PFP for FID:', entry.fid, error);
        setPfpUrl('/defifa_spinner.gif');
      } finally {
        setIsLoadingPfp(false);
        console.log('load', isLoadingPfp);
      }
    };

    fetchPfp();
  }, [entry.fid, entry.entry_id]);


  // Determine if user can interact with this row (is in fantasy league)
  const canInteract = currentUserEntry !== null && currentUserEntry !== undefined;
  
  // Check if this is the user's own row
  const isUserRow = currentUserFid && entry.fid === currentUserFid;
  
  return (
    <tr
      className={`border-b border-limeGreenOpacity transition-colors text-lightPurple text-sm ${
        isUserRow
          ? 'bg-limeGreenOpacity/20 border-limeGreenOpacity/50 font-bold' // Highlight user's row
          : canInteract 
            ? 'hover:bg-purplePanel cursor-pointer' 
            : 'hover:bg-gray-700 cursor-pointer opacity-80'
      }`}
      onClick={() => onRowClick(entry)}
      title={!canInteract ? 'Join the Fantasy Manager League to mint season passes' : undefined}>
      <td className="py-2 px-2 text-center text-lightPurple font-bold">
        {entry.rank ?? 'N/A'}
      </td>
      <td className="py-2 px-2 flex items-center space-x-2">
        <Image
          src={pfpUrl}
          alt="Manager Avatar"
          className="rounded-full w-8 h-8"
          width={32}
          height={32}
          onError={() => setPfpUrl('/defifa_spinner.gif')}
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
