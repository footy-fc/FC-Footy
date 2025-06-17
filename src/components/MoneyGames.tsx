import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GameTabNavigation from './GameTabNavigation';
import MoneyGamesContent from './MoneyGamesContent';
import OCaptain from './OCaptain';

const MoneyGames: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameType = searchParams?.get('gameType') || 'scoreSquare';

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString());
    if (!params.has('gameType')) {
      params.set('gameType', 'scoreSquare');
      const tab = searchParams?.get('tab') || 'moneyGames';
      const eventId = searchParams?.get('eventId') || '';
      router.push(`/?tab=${tab}&gameType=scoreSquare&eventId=${eventId}`);
    }
  }, [router, searchParams]);

  return (
    <div className="w-full">
      <h2 className="font-2xl text-notWhite font-bold mb-4">Try your skiluck</h2>        
      <GameTabNavigation selectedTab={gameType} />
      {gameType === 'scoreSquare' ? (
        <MoneyGamesContent />
      ) : gameType === 'oCaptain' ? (
        <OCaptain />
      ) : null}
    </div>
  );
};

export default MoneyGames;