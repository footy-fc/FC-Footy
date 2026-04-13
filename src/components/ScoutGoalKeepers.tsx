import React from 'react';
import Image from 'next/image';

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
  saves_per_90: number;
}

interface ScoutGoalKeepersProps {
  playersIn: Players[]; // Define the expected type for the playersIn prop
}

const ScoutGoalKeepers: React.FC<ScoutGoalKeepersProps> = ({ playersIn }) => {
  // Filter players based on minutes and position (Goalkeepers only)
  const filteredPlayers = playersIn.filter(player => player.minutes > 500 && player.position === 'Gk');

  // Sort the players based on xGC per 90 minutes (ascending)
  const sortedPlayers = filteredPlayers.sort((a, b) => a.xgc90 - b.xgc90);

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
            <th className="py-1 px-1 font-medium">xGc 90m</th>
            <th className="py-1 px-1 font-medium">Saves 90m</th>
          </tr>
        </thead>
        <tbody>
          {topPlayers.map((player, index) => (
            <tr
              key={player.id}
              className="border-b border-limeGreenOpacity text-lightPurple text-sm"
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
              <td className="py-1 px-1 text-center">{player.xgc90.toFixed(2)}</td>
              <td className="py-1 px-1 text-center">{player.saves_per_90}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScoutGoalKeepers;
