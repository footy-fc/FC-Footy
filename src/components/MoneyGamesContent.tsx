import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BlockchainScoreSquareCreate from './BlockchainScoreSquareCreate';
import ActiveGamesBrowser from './ActiveGamesBrowser';
import CompletedGamesBrowser from './CompletedGamesBrowser';
import GameStateNavigation from './GameStateNavigation';
import BlockchainScoreSquareDisplayWrapped from './BlockchainScoreSquareDisplayWrapped';
import ScoreSquareTokenGate from './ScoreSquareTokenGate';
import { GameProvider } from '~/context/GameContext';

/**
 * MoneyGamesContent - A component that handles all game states internally
 */
const MoneyGamesContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = searchParams?.get('gameId');
  const eventId = searchParams?.get('eventId');
  const gameStateParam = searchParams?.get('gameState') || 'active';

  const [gameState, setGameState] = useState<'create' | 'active' | 'completed'>(
    gameStateParam === 'completed' ? 'completed' : 
    gameStateParam === 'create' ? 'active' : 'active' // Redirect 'create' to 'active' since create is disabled
  );

  const [hasMounted, setHasMounted] = useState(false);

  // 🧠 Only override 'create' from querystring on first mount
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);

      if ((gameId || eventId) && gameState === 'create') {
        setGameState('active');

        const params = new URLSearchParams(searchParams?.toString());
        params.set('gameState', 'active');

        const tab = params.get('tab') || 'moneyGames';
        const gameType = params.get('gameType') || 'scoreSquare';
        const gameIdParam = gameId ? `&gameId=${gameId}` : '';
        const eventIdParam = eventId ? `&eventId=${eventId}` : '';

        router.replace(
          `/?tab=${tab}&gameType=${gameType}&gameState=active&gameId=${gameIdParam}eventId=${eventIdParam}`,
          { scroll: false }
        );
      }
    }
  }, [gameId, eventId, gameState, hasMounted, router, searchParams]);

  // 🔁 Handle switching tabs
  const handleGameStateChange = (state: string) => {
    setGameState(state as 'create' | 'active' | 'completed');

    const params = new URLSearchParams(searchParams?.toString());
    params.set('gameState', state);

    const tab = searchParams?.get('tab') || 'moneyGames';
    const gameType = searchParams?.get('gameType') || 'scoreSquare';

    // 🚿 Clean up query if we're not in an individual game view
    if (state !== 'active') {
      params.delete('gameId');
      params.delete('eventId');
    }

    router.push(`/?tab=${tab}&gameType=${gameType}&${params.toString()}`, { scroll: false });
  };

  // 👂 Sync query param changes to local state
  useEffect(() => {
    const newGameState = searchParams?.get('gameState');
    if (newGameState) {
      setGameState(newGameState as 'create' | 'active' | 'completed');
    }
  }, [searchParams]);

  return (
    <div className="w-full">
      <GameStateNavigation 
        selectedState={gameState} 
        onStateChange={handleGameStateChange} 
      />

      {gameState === 'create' ? (
        <ScoreSquareTokenGate>
          <BlockchainScoreSquareCreate />
        </ScoreSquareTokenGate>
      ) : gameState === 'active' && eventId ? (
        <GameProvider eventId={eventId}>
          <BlockchainScoreSquareDisplayWrapped eventId={eventId} />
        </GameProvider>
      ) : gameState === 'active' ? (
        <ActiveGamesBrowser initialGameId={gameId} />
      ) : gameState === 'completed' ? (
        <CompletedGamesBrowser />
      ) : (
        <div className="p-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">
          <p>Unknown game state. Please select a valid option.</p>
        </div>
      )}
    </div>
  );
};

export default MoneyGamesContent;
