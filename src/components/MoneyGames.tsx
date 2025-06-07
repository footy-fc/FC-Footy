import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GameTabNavigation from './GameTabNavigation';
import MoneyGamesContent from './MoneyGamesContent';

const MoneyGames: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('gameType', 'scoreSquare');
    const tab = searchParams?.get('tab') || 'moneyGames';
    const eventId = searchParams?.get('eventId') || '';
    router.push(`/?tab=${tab}&gameType=scoreSquare&eventId=${eventId}`);
  }, [router, searchParams]);

  return (
    <div className="w-full">
      <GameTabNavigation selectedTab="scoreSquare" />
      <MoneyGamesContent />
    </div>
  );
};

export default MoneyGames;