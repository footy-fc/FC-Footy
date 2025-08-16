/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { sdk as frameSdk } from "@farcaster/miniapp-sdk";
// import { BASE_URL } from '~/lib/config';

export interface FantasyEntry {
  id: number;
  rank: number;
  manager: string;
  teamName: string;
  totalPoints: number;
  eventTotal: number;
  entry: number;
  entryName: string;
  fid?: number;
  team?: {
    name: string | null;
    logo: string | null;
  };
}


interface FantasyRowProps {
  entry: FantasyEntry;  // Consistent FantasyEntry type
  onRowClick: (entry: FantasyEntry) => void;
}

const FantasyRow: React.FC<FantasyRowProps> = ({ entry, onRowClick }) => {
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
        for (const message of messages) {
          if (message.data?.userDataBody?.type === 'USER_DATA_TYPE_PFP') {
            const pfp = message.data.userDataBody.value;
            if (pfp && pfp !== '/defifa_spinner.gif') {
              setPfpUrl(pfp);
              return;
            }
          }
        }
        
        // If no PFP found, use fallback
        setPfpUrl('/defifa_spinner.gif');
      } catch (error) {
        console.error('Error fetching PFP for FID:', entry.fid, error);
        setPfpUrl('/defifa_spinner.gif');
      } finally {
        setIsLoadingPfp(false);
      }
    };

    fetchPfp();
  }, [entry.fid]);


  return (
    <tr
      className="border-b border-limeGreenOpacity hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer"
      onClick={() => onRowClick(entry)}>
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
