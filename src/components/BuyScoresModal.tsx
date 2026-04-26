'use client';

import React from 'react';

interface BuyScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  requiredAmount?: number;
  currentBalance?: number;
  onPurchaseSuccess?: () => void;
}

const BuyScoresModal: React.FC<BuyScoresModalProps> = ({
  isOpen,
  onClose,
  featureName = "AI Commentary",
  requiredAmount = 500,
  currentBalance = 0,
}) => {
  if (!isOpen) return null;

  const tokensNeeded = Math.max(0, requiredAmount - currentBalance);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Unlock {featureName}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              Close
            </button>
          </div>

          <div className="bg-darkPurple rounded-lg p-4 mb-4 border border-limeGreenOpacity">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lightPurple text-sm">Your Balance:</span>
              <span className="text-notWhite font-semibold">{currentBalance.toLocaleString()} SCORES</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lightPurple text-sm">Required:</span>
              <span className="text-fontRed font-semibold">{requiredAmount.toLocaleString()} SCORES</span>
            </div>
            {tokensNeeded > 0 && (
              <div className="mt-2 p-2 bg-red-900/30 border border-red-500/50 rounded text-center">
                <span className="text-red-300 text-sm">
                  Need {tokensNeeded.toLocaleString()} more SCORES
                </span>
              </div>
            )}
          </div>

          <div className="bg-gray-800/70 rounded-lg shadow-lg p-4 border border-gray-700 mb-4">
            <div className="text-sm text-lightPurple space-y-2">
              <p>The onchain SCORES purchase flow has been removed from the reduced Footy app.</p>
              <p>This modal remains only so older gated flows fail gracefully instead of crashing.</p>
              <p className="text-xs text-gray-400">
                If this feature returns, it should be rebuilt against the current wallet and points stack rather than the retired Juice integration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyScoresModal;
