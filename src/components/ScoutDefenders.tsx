import React from 'react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk'; // Import the Farcaster SDK

interface Players {
  photo: string;
  id: number;
  webName: string;
  teamLogo: string;
  position: string;
  xgi90: number;
  xgc90: number;
  expected_goals_per_90: number;
  expected_assists_per_90: number;
  minutes: number;
  team: string;
}

interface ScoutDefendersProps {
  playersIn: Players[]; // Define the expected type for the playersIn prop
}

const ScoutDefenders: React.FC<ScoutDefendersProps> = ({ playersIn }) => {
  const BASE_URL = 'fc-footy.vercel.app'; // Example base URL for embedding

  const handleCastClick = async (player: Players, rank: number) => {
    const summary = `FC-FEPL: ${player.webName} from ${player.team} is #${rank} in defender rank with an enhanced expected goals conceded (xGC) of ${
      ((player.xgi90 * 5) - player.xgc90).toFixed(2)
    }.\n\nThe ExGC is calculated as 5x expected goal involvement (xGI) per 90 minutes minus expected goals conceded (xGC) per 90 minutes. Higher numbers are better. \n\nCheck out the full list of top defenders in the FC Footy app cc @gabedev.eth @kmacb.eth`;

    const shareUrl = `${BASE_URL}/?tab=scout%20Players`;

    try {
      // Validate player photo URL before using it
      const photoUrl = player.photo && player.photo !== '/defifa_spinner.gif' 
        ? player.photo 
        : undefined;
      
      await sdk.actions.composeCast({
        text: summary,
        embeds: photoUrl ? [shareUrl, photoUrl] : [shareUrl],
      });
    } catch (error) {
      console.error('Failed to compose cast:', error);
    }
  };

  // Filter players based on minutes and position (Defenders only)
  const filteredPlayers = playersIn.filter(player => player.minutes > 1000 && player.position === 'Def');

  // Sort the players based on KMac Coefficient
  const sortedPlayers = filteredPlayers.sort((a, b) => {
    const kmacCoeffA = (a.xgi90 * 5) - a.xgc90;
    const kmacCoeffB = (b.xgi90 * 5) - b.xgc90;
    return kmacCoeffB - kmacCoeffA; // Sort in descending order
  });

  // Only take the top 20 players
  const topPlayers = sortedPlayers.slice(0, 20);

  return (
    <div className="w-full h-full overflow-y-auto p-4 pr-2 pl-2">
      <table className="w-full bg-darkPurple border border-limeGreenOpacity rounded-lg shadow-lg overflow-hidden">
        <thead>
          <tr className="bg-darkPurple text-notWhite text-center border-b border-limeGreenOpacity">
            <th className="py-1 px-1 font-medium">Rank</th>
            <th className="py-1 px-1 font-medium">Player</th>
            <th className="py-1 px-1 font-medium">Team</th>
            <th className="py-1 px-1 font-medium">ExGc</th>
            <th className="py-1 px-1 font-medium">xGc 90m</th>
            <th className="py-1 px-1 font-medium">xGi 90m</th>
          </tr>
        </thead>
        <tbody>
          {topPlayers.map((player, index) => (
            <tr
              key={player.id}
              onClick={() => handleCastClick(player, index + 1)}
              className="border-b border-limeGreenOpacity hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer"
            >
              <td className="py-1 px-1 text-center">
                <span className="mb-1">{index + 1}</span>
              </td>
              <td className="py-1 px-1">
                <div className="flex items-center justify-left space-x-2">
                  <span>{player.webName}</span>
                </div>
              </td>
              <td className="py-1 px-1 text-center">
                <Image src={player.teamLogo} alt={player.team} width={30} height={30} />
              </td>
              <td className="py-1 px-1 text-center">
                {((player.xgi90 * 5) - player.xgc90).toFixed(2)}
              </td>
              <td className="py-1 px-1 text-center">{player.xgc90.toFixed(2)}</td>
              <td className="py-1 px-1 text-center">{player.xgi90.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScoutDefenders;
