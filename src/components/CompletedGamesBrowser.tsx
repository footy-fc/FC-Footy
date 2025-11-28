'use client';

import React from 'react';
import { useGames } from '../hooks/useSubgraphData';
import CompletedGameCard from './CompletedGameCard';
import type { SubgraphGame } from '../types/gameTypes';

const CompletedGamesBrowser: React.FC = () => {
  const { data, loading, error } = useGames(10, 0);

  const completedGames = data?.games
    ? data.games
        .filter((g: SubgraphGame) => g.prizeClaimed || g.refunded)
        .sort((a: { createdAt: string; }, b: { createdAt: string; }) => parseInt(b.createdAt) - parseInt(a.createdAt))
    : [];

  if (loading) return <div className="p-4 text-gray-400">Loading completed games...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div className="p-4">
      <div className="bg-midnight/80 border border-brightPink/30 rounded-2xl shadow-[0_18px_38px_rgba(0,0,0,0.45)] p-4">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-brightPink mb-1">Score Square</p>
            <h2 className="text-2xl text-white font-bold">Completed Games</h2>
            <p className="text-sm text-lightPurple mt-1">Check final scores, winnings, and refunds in the refreshed card style.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {completedGames.map((game: SubgraphGame) => (
            <CompletedGameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompletedGamesBrowser;
