import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { fetchPlayerElements } from './utils/fetchPlayerElements';
import { sdk } from '@farcaster/frame-sdk';

interface Player {
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
  element_type: number;
  saves_per_90: number;
}

interface SwipeState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const OCaptain: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // App state
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showPositionSelection, setShowPositionSelection] = useState(true);
  
  // Swipe state
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  
  // New state for stake selection
  const [stakeAmount, setStakeAmount] = useState(1);
  const [boostEnabled, setBoostEnabled] = useState(false);

  // Double-tap detection state
  const [lastTapTime, setLastTapTime] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch player data from the API
  useEffect(() => {
    const getPlayerData = async () => {
      try {
        const data = await fetchPlayerElements();
        setPlayers(data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    getPlayerData();
  }, []);

  // Disable native gestures to prevent mini-app from closing on swipe-down
  useEffect(() => {
    const disableGestures = async () => {
      try {
        await sdk.actions.ready({ disableNativeGestures: true });
        console.log('Attempting to disable native gestures...');
      } catch (error) {
        console.log('Could not disable native gestures:', error);
      }
    };

    disableGestures();
  }, []);

  // Helper functions to calculate ranking stats
  const getEnhancedXGI = (player: Player) => {
    return (player.expected_assists_per_90 * 3) + (player.expected_goals_per_90 * 5);
  };

  const getKMacCoefficient = (player: Player) => {
    return (player.xgi90 * 5) - player.xgc90;
  };

  // Filter players by position and create sets with proper sorting
  const forwards = players
    .filter(player => player.minutes > 400 && player.position === 'Fwd')
    .sort((a, b) => {
      const xgiPer90A = getEnhancedXGI(a);
      const xgiPer90B = getEnhancedXGI(b);
      return xgiPer90B - xgiPer90A;
    })
    .slice(0, 12);

  const midfielders = players
    .filter(player => player.minutes > 400 && player.position === 'Mid')
    .sort((a, b) => {
      const xgiPer90A = getEnhancedXGI(a);
      const xgiPer90B = getEnhancedXGI(b);
      return xgiPer90B - xgiPer90A;
    })
    .slice(0, 12);

  const defenders = players
    .filter(player => player.minutes > 1000 && player.position === 'Def')
    .sort((a, b) => {
      const kmacCoeffA = getKMacCoefficient(a);
      const kmacCoeffB = getKMacCoefficient(b);
      return kmacCoeffB - kmacCoeffA;
    })
    .slice(0, 12);

  const goalkeepers = players
    .filter(player => player.minutes > 500 && player.position === 'Gk')
    .sort((a, b) => a.xgc90 - b.xgc90)
    .slice(0, 12);

  const playerSets = [forwards, midfielders, defenders, goalkeepers];
  const setNames = ['Forwards', 'Midfielders', 'Defenders', 'Goalkeepers'];

  // Get current player set
  const currentPlayerSet = playerSets[currentPosition];
  const currentPlayer = currentPlayerSet?.[currentPlayerIndex];

  // Handle position selection
  const handlePositionSelect = (positionIndex: number) => {
    setCurrentPosition(positionIndex);
    setCurrentPlayerIndex(0);
    setShowPositionSelection(false);
  };

  // Handle swipe selection
  const handleSwipeSelect = async (player: Player) => {
    // Pronounced haptic feedback for accept
    try {
      await sdk.haptics.impactOccurred('heavy');
    } catch {
      // ignore haptics errors
    }
    
    if (selectedPlayers.length < 2 && !selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
    nextPlayer();
  };

  // Handle swipe reject
  const handleSwipeReject = async () => {
    // Subtle haptic feedback for skip
    try {
      await sdk.haptics.impactOccurred('light');
    } catch {
      // ignore haptics errors
    }
    
    nextPlayer();
  };

  // Move to next player
  const nextPlayer = () => {
    if (currentPlayerIndex < currentPlayerSet.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    } else {
      // Move to next position, loop back to first position if at the end
      const nextPosition = (currentPosition + 1) % playerSets.length;
      setCurrentPosition(nextPosition);
      setCurrentPlayerIndex(0);
    }
  };

  // Handle player role toggle
  const handlePlayerToggle = async (player: Player) => {
    // Haptic feedback for remove/add
    try {
      await sdk.haptics.impactOccurred('medium');
    } catch {
      // ignore haptics errors
    }
    
    setSelectedPlayers(prev => {
      const index = prev.findIndex(p => p.id === player.id);
      if (index !== -1) {
        return prev.filter(p => p.id !== player.id);
      } else if (prev.length < 2) {
        return [...prev, player];
      }
      return prev;
    });
  };

  // Handle double-tap on player card
  const handleDoubleTap = async () => {
    const now = Date.now();
    const timeDiff = now - lastTapTime;
    if (timeDiff < 300 && timeDiff > 0) {
      try {
        await sdk.haptics.notificationOccurred('error');
      } catch {
        try {
          await sdk.haptics.impactOccurred('heavy');
        } catch {
          // ignore haptics errors
        }
      }
      setLastTapTime(0);
    } else {
      setLastTapTime(now);
      setTimeout(() => {
        setLastTapTime(0);
      }, 300);
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeState({
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeState.isDragging) return;
    
    const touch = e.touches[0];
    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
    }));
  };

  const handleTouchEnd = () => {
    if (!swipeState.isDragging || !currentPlayer) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaY = swipeState.currentY - swipeState.startY;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > minSwipeDistance) {
        // Swipe right - select
        handleSwipeSelect(currentPlayer);
      } else if (deltaX < -minSwipeDistance) {
        // Swipe left - reject
        handleSwipeReject();
      }
    } else {
      // Vertical swipe
      if (deltaY < -minSwipeDistance) {
        // Swipe up - reject
        handleSwipeReject();
      }
    }

    setSwipeState({
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  };

  // Get ranking stat for current position
  const getRankingStat = (player: Player) => {
    switch (setNames[currentPosition]) {
      case 'Forwards':
      case 'Midfielders':
        return getEnhancedXGI(player);
      case 'Defenders':
        return getKMacCoefficient(player);
      case 'Goalkeepers':
        return player.xgc90;
      default:
        return 0;
    }
  };

  // Get ranking stat label
  const getRankingStatLabel = () => {
    switch (setNames[currentPosition]) {
      case 'Forwards':
      case 'Midfielders':
        return 'ExGI';
      case 'Defenders':
        return 'ExGC';
      case 'Goalkeepers':
        return 'xGC';
      default:
        return '';
    }
  };

  // Get detailed stats for player card
  const getPlayerStats = (player: Player) => {
    switch (setNames[currentPosition]) {
      case 'Forwards':
      case 'Midfielders':
        return {
          primary: getEnhancedXGI(player).toFixed(2),
          secondary: player.xgi90.toFixed(2),
          label1: 'ExGI',
          label2: 'xGI 90m'
        };
      case 'Defenders':
        return {
          primary: getKMacCoefficient(player).toFixed(2),
          secondary: player.xgc90.toFixed(2),
          tertiary: player.xgi90.toFixed(2),
          label1: 'ExGC',
          label2: 'xGC 90m',
          label3: 'xGI 90m'
        };
      case 'Goalkeepers':
        return {
          primary: player.xgc90.toFixed(2),
          secondary: player.saves_per_90.toFixed(1),
          label1: 'xGC 90m',
          label2: 'Saves 90m'
        };
      default:
        return { primary: '0.00', secondary: '0.00', label1: '', label2: '' };
    }
  };

  // Add stake options
  const stakeOptions = [1, 5, 10, 25, 50, 100];

  // Calculate potential winnings based on stake
  const calculatePotentialWinnings = (stake: number) => {
    // Simple calculation - in reality this would be based on prize pool and participants
    return stake * 2.5; // Example: 2.5x return
  };

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="font-2xl text-notWhite font-bold mb-4">O&apos;Captain</h2>
        <div className="text-center text-lightPurple">Loading players...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h2 className="font-2xl text-notWhite font-bold mb-4">O&apos;Captain</h2>
        <div className="text-center text-fontRed">Error: {error}</div>
      </div>
    );
  }



  // Position Selection Screen
  if (showPositionSelection) {
    return (
      <div className="w-full">
        <h2 className="font-2xl text-notWhite font-bold mb-4">O&apos;Captain</h2>
        
        <div className="bg-darkPurple p-4 rounded-lg mb-4">
          <h3 className="text-lightPurple font-semibold mb-4 text-center">Choose Position</h3>
          <div className="grid grid-cols-2 gap-4">
            {setNames.map((position, index) => {
              const positionPlayers = playerSets[index];
              const topPlayers = positionPlayers.slice(0, 3);
              
              return (
                <div
                  key={position}
                  onClick={() => handlePositionSelect(index)}
                  className="bg-purplePanel p-4 rounded-lg cursor-pointer hover:bg-purplePanel/80 transition-colors"
                >
                  <h4 className="text-lightPurple font-semibold mb-2">{position}</h4>
                  <div className="space-y-1">
                    {topPlayers.map((player, playerIndex) => (
                      <div key={player.id} className="flex items-center space-x-2 text-xs">
                        <span className="text-gray-400">{playerIndex + 1}.</span>
                        <span className="text-lightPurple">{player.webName}</span>
                        <span className="text-limeGreenOpacity font-bold">
                          {getRankingStat(player).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Player Selection Screen
  return (
    <div className="w-full">
      <h2 className="font-2xl text-notWhite font-bold mb-4">O&apos;Captain</h2>
      
      {/* Header */}
      <div className="bg-darkPurple p-3 rounded-lg mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lightPurple font-semibold">{setNames[currentPosition]}</span>
          <span className="text-gray-400 text-sm">
            {currentPlayerIndex + 1} / {currentPlayerSet.length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Selected: {selectedPlayers.length}/2</span>
          <button
            onClick={() => setShowPositionSelection(true)}
            className="text-limeGreenOpacity text-sm hover:underline"
          >
            Change Position
          </button>
        </div>
      </div>

      {/* Selected Players */}
      {selectedPlayers.length > 0 && (
        <div className="bg-purplePanel p-3 rounded-lg mb-4">
          <h3 className="text-lightPurple font-semibold mb-2">Your Selection:</h3>
          <div className="flex space-x-3">
            {selectedPlayers.map((player, index) => (
                              <div
                  key={player.id}
                  onClick={async () => await handlePlayerToggle(player)}
                  className="flex-1 bg-darkPurple rounded-lg p-2 border-2 border-limeGreenOpacity cursor-pointer hover:border-red-400 transition-colors"
                >
                <div className="flex items-center space-x-2">
                  <Image
                    src={player.photo}
                    alt={player.webName}
                    width={40}
                    height={40}
                    className="rounded-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/defifa_spinner.gif';
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-lightPurple font-semibold text-xs">
                      {player.webName}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {index === 0 ? 'Captain' : 'Vice-Captain'}
                    </div>
                    <div className="text-limeGreenOpacity text-xs font-bold mt-1">
                      {getRankingStatLabel()}: {getRankingStat(player).toFixed(2)}
                    </div>
                  </div>
                  {selectedPlayers.length === 1 && (
                    <div className="text-red-400 text-xs">
                      Tap to remove
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {selectedPlayers.length === 2 && (
            <div className="mt-2 text-center text-gray-400 text-xs">
              Tap any player above to remove and continue selecting
            </div>
          )}
        </div>
      )}

      {/* Player Card - Only show if less than 2 selections */}
      {currentPlayer && selectedPlayers.length < 2 && (
        <div className="relative">
          <div
            ref={cardRef}
            className="bg-darkPurple rounded-lg overflow-hidden shadow-lg"
            style={{
              transform: swipeState.isDragging
                ? `translate(${swipeState.currentX - swipeState.startX}px, ${swipeState.currentY - swipeState.startY}px) rotate(${(swipeState.currentX - swipeState.startX) * 0.1}deg)`
                : 'translate(0px, 0px) rotate(0deg)',
              transition: swipeState.isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
          >
            {/* Player Image */}
            <div className="aspect-[3/4] relative">
              <Image
                src={currentPlayer.photo}
                alt={currentPlayer.webName}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/defifa_spinner.gif';
                }}
              />
              
              {/* Overlay with player info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-darkPurple to-transparent p-4">
                <div className="text-lightPurple font-bold text-lg">
                  {currentPlayer.webName}
                </div>
                <div className="text-gray-400 text-sm">
                  {currentPlayer.team}
                </div>
                <div className="text-limeGreenOpacity font-bold text-sm mt-1">
                  {getRankingStatLabel()}: {getRankingStat(currentPlayer).toFixed(2)}
                </div>
              </div>
            </div>
            
            {/* Player Stats */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                {(() => {
                  const stats = getPlayerStats(currentPlayer);
                  return (
                    <>
                      <div>
                        <div className="text-gray-400 text-xs">{stats.label1}</div>
                        <div className="text-limeGreenOpacity font-bold">{stats.primary}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs">{stats.label2}</div>
                        <div className="text-lightPurple">{stats.secondary}</div>
                      </div>
                      {stats.tertiary && (
                        <div className="col-span-2">
                          <div className="text-gray-400 text-xs">{stats.label3}</div>
                          <div className="text-lightPurple">{stats.tertiary}</div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Swipe Instructions */}
          <div className="mt-4 text-center text-gray-400 text-sm">
            <div className="flex justify-center space-x-4">
              <button
                onClick={async () => { if (currentPlayer) { await handleSwipeReject(); } }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (currentPlayer) { await handleSwipeReject(); }
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-purplePanel hover:bg-purplePanel/80 transition-colors focus:outline-none focus:ring-2 focus:ring-limeGreenOpacity"
                aria-label="Skip this player"
                title="Skip this player"
              >
                <span className="text-lg">←</span>
                <span>Skip Player</span>
              </button>
              
              <button
                onClick={async () => { if (currentPlayer) { await handleSwipeSelect(currentPlayer); } }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (currentPlayer) { await handleSwipeSelect(currentPlayer); }
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-purplePanel hover:bg-purplePanel/80 transition-colors focus:outline-none focus:ring-2 focus:ring-limeGreenOpacity"
                aria-label="Select this player"
                title="Select this player"
              >
                <span className="text-lg">→</span>
                <span>Select Player</span>
              </button>
            </div>
            
            {/* Additional accessibility info */}
            <div className="mt-2 text-xs text-gray-500">
              <p>You can also swipe left/up to skip or swipe right to select</p>
              <p>Use Tab to navigate between buttons, Enter or Space to activate</p>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button - Only show when exactly 2 selections are made */}
      {selectedPlayers.length === 2 && (
        <div className="mt-6">
          {/* Stake Selection */}
          <div className="bg-purplePanel p-4 rounded-lg mb-4">
            <h3 className="text-lightPurple font-semibold mb-3 text-center">Select Your Stake</h3>
            <div className="text-center text-gray-400 text-sm mb-4">
              Higher stakes = larger share of the prize pool
            </div>
            
            {/* Stake Amount Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {stakeOptions.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setStakeAmount(amount)}
                  className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
                    stakeAmount === amount
                      ? 'bg-limeGreenOpacity text-darkPurple'
                      : 'bg-darkPurple text-lightPurple hover:bg-darkPurple/80'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>
            
            {/* Potential Winnings Display */}
            <div className="text-center">
              <div className="text-gray-400 text-xs">Potential Winnings</div>
              <div className="text-limeGreenOpacity font-bold text-lg">
                ${calculatePotentialWinnings(stakeAmount).toFixed(0)} USDC
              </div>
            </div>
          </div>

          {/* Boost Selection */}
          <div className="bg-purplePanel p-4 rounded-lg mb-4">
            <h3 className="text-lightPurple font-semibold mb-2 text-center">Apply Boost?</h3>
            <div className="text-center text-gray-400 text-sm mb-4">
              2x your vice-captain&apos;s score
            </div>
            <button
              onClick={() => setBoostEnabled(!boostEnabled)}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                boostEnabled
                  ? 'bg-limeGreenOpacity text-darkPurple'
                  : 'bg-darkPurple text-lightPurple border-2 border-limeGreenOpacity hover:bg-darkPurple/80'
              }`}
            >
              {boostEnabled ? '✓ Boost Applied' : 'Apply Boost'}
            </button>
          </div>

          {/* Lock Button */}
          <button className="w-full bg-limeGreenOpacity text-darkPurple py-3 px-4 rounded-lg font-semibold hover:bg-limeGreenOpacity/80 transition-colors">
            Lock ${stakeAmount} USDC
          </button>
        </div>
      )}
    </div>
  );
};

export default OCaptain; 