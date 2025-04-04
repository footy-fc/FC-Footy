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
    <div className="p-4 flex flex-col gap-4 items-center">
      {completedGames.map((game: SubgraphGame) => (
        <CompletedGameCard key={game.id} game={game} />
      ))}
    </div>
  );
};

export default CompletedGamesBrowser;
