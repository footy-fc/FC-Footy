'use client';

import React from 'react';

interface Player {
  name: string;
  position: string;
  team: string;
  teamAbbr: string;
  originalIndex: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

interface TeamDisplayProps {
  content: string;
}

export const TeamDisplay: React.FC<TeamDisplayProps> = ({ content }) => {
  const parseTeamContent = (content: string) => {
    const sections = content.split('\n\n');
    const team: {
      startingXI: Player[];
      bench: Player[];
    } = {
      startingXI: [],
      bench: []
    };

    sections.forEach(section => {
      if (section.startsWith('Starting XI:')) {
        const players = section
          .split('\n')
          .slice(1) // Skip the "Starting XI:" header
          .map((line, index) => {
            const match = line.match(/\d+\.\s*(.*?)\s*-\s*(.*?)\s*-\s*(.*?)\s*\((.*?)\)(?:\s*\((C|V)\))?/);
            if (match) {
              return {
                name: match[1].trim(),
                position: match[2].trim(),
                team: match[3].trim(),
                teamAbbr: match[4].trim(),
                originalIndex: index,
                isCaptain: match[5] === 'C',
                isViceCaptain: match[5] === 'V'
              };
            }
            return null;
          })
          .filter((player): player is Player => player !== null);
        
        team.startingXI = players;
      } else if (section.startsWith('Bench:')) {
        const players = section
          .split('\n')
          .slice(1) // Skip the "Bench:" header
          .map((line, index) => {
            const match = line.match(/\d+\.\s*(.*?)\s*-\s*(.*?)\s*-\s*(.*?)\s*\((.*?)\)/);
            if (match) {
              return {
                name: match[1].trim(),
                position: match[2].trim(),
                team: match[3].trim(),
                teamAbbr: match[4].trim(),
                originalIndex: index,
                isCaptain: false,
                isViceCaptain: false
              };
            }
            return null;
          })
          .filter((player): player is Player => player !== null);
        
        team.bench = players;
      }
    });

    return team;
  };

  const team = parseTeamContent(content);

  const getPositionClass = (position: string) => {
    const pos = position.toLowerCase();
    if (pos.includes('goalkeeper')) return 'text-yellow-400';
    if (pos.includes('defender')) return 'text-blue-400';
    if (pos.includes('midfielder')) return 'text-green-400';
    if (pos.includes('forward')) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="font-mono text-sm">
      {/* Starting XI */}
      <div>
        <h3 className="text-lg font-semibold text-blue-300 mb-2">Starting XI:</h3>
        <div>
          {team.startingXI
            .sort((a, b) => a.originalIndex - b.originalIndex)
            .map((player, index) => (
              <div key={index} className={`flex items-center gap-2 mb-1 ${player.isCaptain || player.isViceCaptain ? 'bg-white/5 p-2 rounded-lg' : ''}`}>
                <span className="text-gray-400 w-4">{index + 1}.</span>
                <span className={`font-medium ${player.isCaptain ? 'text-yellow-400' : player.isViceCaptain ? 'text-yellow-300' : ''}`}>
                  {player.name}
                </span>
                <span className={`${getPositionClass(player.position)}`}>
                  {player.position.toUpperCase()}
                </span>
                <span className="text-gray-400 font-mono">
                  {player.teamAbbr}
                </span>
                {player.isCaptain && (
                  <span className="text-yellow-400 font-bold">(C)</span>
                )}
                {player.isViceCaptain && (
                  <span className="text-yellow-400 font-bold">(V)</span>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Bench */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-blue-300 mb-2">Bench:</h3>
        <div>
          {team.bench
            .sort((a, b) => a.originalIndex - b.originalIndex)
            .map((player, index) => (
              <div key={index} className="flex items-center gap-2 mb-1">
                <span className="text-gray-400 w-4">{index + 1}.</span>
                <span className="font-medium">{player.name}</span>
                <span className={`${getPositionClass(player.position)}`}>
                  {player.position.toUpperCase()}
                </span>
                <span className="text-gray-400 font-mono">
                  {player.teamAbbr}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}; 