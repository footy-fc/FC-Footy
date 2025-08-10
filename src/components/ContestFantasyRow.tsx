/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import frameSdk from "@farcaster/frame-sdk";
// import { BASE_URL } from '~/lib/config';

export interface FantasyEntry {
  rank: number;
  pfp: string | null;
  team: {
    name: string | null;
    logo: string | null;
  };
  manager: string;
  entry_name: string | null;
  last_name: string | null;
  fav_team: number | null;
  total: number | null;
  location: string | null;
  fid: number | null;
}


interface FantasyRowProps {
  entry: FantasyEntry;  // Consistent FantasyEntry type
  onRowClick: (entry: FantasyEntry) => void;
}

const FantasyRow: React.FC<FantasyRowProps> = ({ entry, onRowClick }) => {
  const { manager, total, team } = entry;
  const [context, setContext] = useState<unknown>(undefined);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  //const frameUrl = BASE_URL || 'fc-footy.vercel.app';

  useEffect(() => {
    const loadContext = async () => {
      try {
        setContext(await frameSdk.context);
        setIsContextLoaded(true);
      } catch (error) {
        console.error("Failed to load Farcaster context:", error);
      }
    };

    if (!isContextLoaded) {
      console.log('loading context', context);
      loadContext();
    }
  }, [isContextLoaded]);


  return (
    <tr
      className="border-b border-limeGreenOpacity hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer"
      onClick={() => onRowClick(entry)}>
      <td className="py-2 px-2 text-center text-lightPurple font-bold">
        {entry.rank ?? 'N/A'}
      </td>
      <td className="py-2 px-2 flex items-center space-x-2">
        <Image
          src={entry.pfp || '/defifa_spinner.gif'}
          alt="Manager Avatar"
          className="rounded-full w-8 h-8"
          width={30}
          height={30}
        />
        {team.logo && team.logo !== '/defifa_spinner.gif' && (
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
        {manager}
      </td>
      <td className="py-2 px-2 text-center text-lightPurple">
        {total ?? 'N/A'}
      </td>
    </tr>
  );
};

export default FantasyRow;
