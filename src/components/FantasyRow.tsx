/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import frameSdk from "@farcaster/frame-sdk";
import { BASE_URL } from '~/lib/config';
import { FrameContext } from '@farcaster/frame-node';

interface FantasyRowProps {
  entry: FantasyEntry; // Use the FantasyEntry type here
}

// Define the FantasyEntry type
interface FantasyEntry {
  pfp: string | null;
  team: {
    name: string | null;
    logo: string | null;
  };
  manager: string;
  entry_name: string | null;
  rank: number | null;
  last_name: string | null;
  fav_team: number | null;
  total: number | null;
}

const FantasyRow: React.FC<FantasyRowProps> = ({ entry }) => {
  const { manager, rank, total, fav_team, team } = entry;
  const [context, setContext] = useState<FrameContext | undefined>(undefined);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const frameUrl = BASE_URL || 'fc-footy.vercel.app';

    useEffect(() => {
      const loadContext = async () => {
        try {
          setContext((await frameSdk.context) as FrameContext);
          setIsContextLoaded(true);
        } catch (error) {
          console.error("Failed to load Farcaster context:", error);
        }
      };
  
      if (!isContextLoaded) {
        loadContext();
      }
    }, [isContextLoaded]);
  
  // Function to create and open the cast URL
  const handleCastClick = () => {
    const summary = fav_team
      ? `FC-FEPL @${manager} supports ${team.name}. They are ranked #${rank} in the FC fantasy league with ${total} points.`
      : `FC-FEPL @${manager} has no favorite team. They are ranked #${rank} in the FC fantasy league with ${total} points.`;

    // Encode the summary and create the cast URL
    const encodedSummary = encodeURIComponent(summary);

    // Create the URL with both the team logo and the frame URL as embeds
    const url = `https://warpcast.com/~/compose?text=${encodedSummary}&channelKey=football&embeds[]=${encodeURIComponent(team.logo || '')}&embeds[]=${frameUrl}`;
    if (context === undefined) {
      window.open(url, '_blank');
    } else {
      frameSdk.actions.openUrl(url);
    }
  };

  // Only make the row clickable if there is a team logo. Change this with new skd cast features
  const handleRowClick = team.logo ? () => {
    handleCastClick(); // Generate and open the cast URL
  } : undefined; // If no logo, do not attach the click handler

  return (
    <tr
      className={`cursor-pointer hover:bg-deepPink ${!team.logo ? 'opacity-50 pointer-events-none' : ''}`} // Disable pointer events and add opacity if no team logo
      onClick={handleRowClick}
    >
      <td className="relative flex items-center space-x-2 px-2 mr-2">
        <Image
          src={entry.pfp || '/defifa_spinner.gif'}
          alt="Home Team Logo"
          className="rounded-full w-8 h-8 mr-8"
          width={20}
          height={20}
        />
        {team.logo && team.logo !== '/defifa_spinner.gif' && (
          <Image
            src={team.logo || '/default-team-logo.png'}  // Provide fallback if logo is null
            alt="Team Logo"
            className="rounded-full w-5 h-5 absolute top-0 left-7"
            width={15}
            height={15}
            loading="lazy"
          />
        )}
      </td>
      <td>{entry.manager}</td>
      <td className="text-center">{entry.rank}</td>
      <td className="text-center">{entry.total}</td>
    </tr>
  );
};

export default FantasyRow;
