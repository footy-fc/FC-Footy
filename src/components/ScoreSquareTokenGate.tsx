import React, { useState } from 'react';
import { useScoresTokenGate } from '../hooks/useScoresTokenGate';
import { useRouter } from 'next/navigation';
import ScoresInfo from './ScoresInfo';

interface ScoreSquareTokenGateProps {
  children: React.ReactNode;
}

const ScoreSquareTokenGate: React.FC<ScoreSquareTokenGateProps> = ({ 
  children 
}) => {
  const { hasScores, isLoading, isConnected, balance } = useScoresTokenGate();
  const router = useRouter();
  const [showScoresInfo, setShowScoresInfo] = useState(false);

  const handleBuyScores = () => {
    // Navigate to the For You tab and trigger Buy Points section
    router.push('/?tab=forYou&showBuyPoints=true');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-lightPurple">Checking $SCORES balance...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-darkPurple rounded-lg p-6 text-center border border-limeGreenOpacity">
        <h3 className="text-xl font-bold text-notWhite mb-3">🔒 ScoreSquare Game Creation</h3>
        <p className="text-lightPurple mb-4">
          Connect your wallet to create ScoreSquare games and earn from ticket sales
        </p>
        <div className="text-sm text-gray-400">
          This feature requires $SCORES tokens
        </div>
      </div>
    );
  }

  if (!hasScores) {
    const isTestMode = process.env.NEXT_PUBLIC_TEST_NO_TOKENS === 'true';
    const requiredAmount = parseInt(process.env.NEXT_PUBLIC_MIN_REQUIRED_SCORES || '12000000');
    
    return (
      <div className="bg-darkPurple rounded-lg p-6 text-center border border-limeGreenOpacity">
        {isTestMode && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-2 mb-4">
            <p className="text-yellow-300 text-sm">🧪 TESTING MODE: Simulating no tokens</p>
          </div>
        )}
        <h3 className="text-xl font-bold text-notWhite mb-3">🔒 ScoreSquare Game Creation</h3>
        <p className="text-lightPurple mb-4">
          You need <span className="text-fontRed font-bold">{requiredAmount.toLocaleString()}</span> $SCORES tokens to create ScoreSquare games.
        </p>
        {isConnected && (
          <div className="bg-deepPurple rounded-lg p-3 mb-4 border border-limeGreenOpacity">
            <p className="text-sm text-lightPurple">
              Your balance: <span className="text-notWhite font-semibold">{balance.toLocaleString()}</span> $SCORES
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Need {Math.max(0, requiredAmount - balance).toLocaleString()} more $SCORES
            </p>
          </div>
        )}
        <div className="bg-deepPurple rounded-lg p-4 mb-4 border border-limeGreenOpacity">
          <button
            onClick={() => setShowScoresInfo(true)}
            className="hover:text-deepPink transition-colors"
          >
            <h4 className="text-notWhite font-semibold mb-2">Why $SCORES for ScoreSquare?→</h4>
          </button>
          <p className="text-sm text-lightPurple mb-3">
            $SCORES holders can create ScoreSquare games and earn a percentage of ticket sales as deployer fees.
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Create games, set ticket prices, and earn from every ticket sold. The more $SCORES you hold, the more exclusive features you unlock.
          </p>
        </div>
        <button
          onClick={handleBuyScores}
          className="bg-fontRed text-white px-6 py-2 rounded-lg hover:bg-deepPink transition-colors"
        >
          Get $SCORES to Create Games
        </button>
      </div>
    );
  }

  return (
    <>
      {showScoresInfo && <ScoresInfo defaultOpen onClose={() => setShowScoresInfo(false)} />}
      {children}
    </>
  );
};

export default ScoreSquareTokenGate;
