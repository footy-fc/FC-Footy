'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserTie, FaLock } from 'react-icons/fa';
import { useAccount } from 'wagmi';
import { useFormattedTokenIssuance } from '~/hooks/useFormattedTokenIssuance';
import { useWriteJbMultiTerminalPay } from 'juice-sdk-react';
import { parseEther } from 'viem';
import { TERMINAL_ADDRESS, PROJECT_ID } from '~/constants/contracts';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { sdk } from "@farcaster/miniapp-sdk";
import { config } from '~/components/providers/WagmiProvider';
import { PriceIncreaseCountdown } from '~/components/points/PriceIncreaseCountdown';

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
  onPurchaseSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ethAmount, setEthAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [isMiniApp, setIsMiniApp] = useState(false);

  const { address } = useAccount();
  const { writeContractAsync } = useWriteJbMultiTerminalPay();

  const issuance = useFormattedTokenIssuance();
  
  const getIssuedPoints = (eth: number) => {
    const pointsPerEth = Number(issuance?.replace(/[^\d.]/g, '') ?? 0);
    return Math.round(pointsPerEth * eth).toLocaleString();
  };

  useEffect(() => {
    const checkMiniApp = async () => {
      const result = await sdk.isInMiniApp();
      setIsMiniApp(result);
    };
    checkMiniApp();
  }, []);

  if (!isMiniApp) return null;

  const handleBuyPack = async (ethAmount: string) => {
    if (!address) return;

    setIsSubmitting(true);
    setTxStatus('pending');

    try {
      const weiAmount = parseEther(ethAmount);
      const payMemo = 'I support Footy App';
      
      const txHash = await writeContractAsync({
        args: [
          PROJECT_ID,
          '0x000000000000000000000000000000000000EEEe',
          weiAmount,
          address,
          0n,
          payMemo,
          '0x0',
        ],
        address: TERMINAL_ADDRESS,
        value: weiAmount,
      });

      if (txHash) {
        setTxStatus('confirmed');
        await waitForTransactionReceipt(config, { hash: txHash });
        
        // Notify parent of successful purchase and close modal
        setTimeout(() => {
          setTxStatus('idle');
          onPurchaseSuccess?.(); // Trigger any refresh logic
          onClose(); // Close the modal
        }, 2000); // Give user time to see success message
      }
    } catch (err) {
      console.error('Contract call failed', err);
      setTxStatus('failed');
      setTimeout(() => setTxStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tokensNeeded = Math.max(0, requiredAmount - currentBalance);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FaLock className="text-fontRed" />
              Unlock {featureName}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Current Status */}
          <div className="bg-darkPurple rounded-lg p-4 mb-4 border border-limeGreenOpacity">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lightPurple text-sm">Your Balance:</span>
              <span className="text-notWhite font-semibold">{currentBalance.toLocaleString()} $SCORES</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lightPurple text-sm">Required:</span>
              <span className="text-fontRed font-semibold">{requiredAmount.toLocaleString()} $SCORES</span>
            </div>
            {tokensNeeded > 0 && (
              <div className="mt-2 p-2 bg-red-900/30 border border-red-500/50 rounded text-center">
                <span className="text-red-300 text-sm">
                  Need {tokensNeeded.toLocaleString()} more $SCORES
                </span>
              </div>
            )}
          </div>

          {/* Buy Section */}
          <div className="bg-gray-800/70 rounded-lg shadow-lg p-4 border border-gray-700 mb-4">
            <div className="text-sm text-lightPurple mb-3">
              <p className="mb-2">Get $SCORES to unlock {featureName} and other exclusive features:</p>
              <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                <li>AI-powered commentary</li>
                <li>Fantasy League features</li>
                <li>Custom emoji packs</li>
                <li>ScoreSquare game creation</li>
              </ul>
            </div>
            
            <PriceIncreaseCountdown />
            
            <div className="mt-3">
              <p className="text-sm text-notWhite mb-2">
                {ethAmount || '0'} ETH = {getIssuedPoints(Number(ethAmount || '0'))}{' '}
                <button
                  onClick={async () => {
                    try {
                      await sdk.actions.viewToken({
                        token: 'eip155:8453/erc20:0xba1afff81a239c926446a67d73f73ec51c37c777',
                      });
                    } catch (err) {
                      console.error('viewToken error:', err);
                    }
                  }}
                  className="text-xs text-lightPurple underline hover:text-fontRed"
                >
                  $SCORES
                </button>
              </p>
              
              <input
                type="number"
                step="0.0001"
                min="0"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                placeholder="Enter ETH amount"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-fontRed"
              />
              
              <button
                onClick={() => handleBuyPack(ethAmount)}
                disabled={isSubmitting || !ethAmount || Number(ethAmount) <= 0}
                className={`w-full mt-3 py-2 px-4 rounded font-medium transition-colors ${
                  isSubmitting || !ethAmount || Number(ethAmount) <= 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-fontRed text-white hover:bg-deepPink'
                }`}
              >
                {isSubmitting ? 'Processing...' : 'Buy $SCORES'}
              </button>
              
              {txStatus !== 'idle' && (
                <div className={`mt-2 p-2 rounded text-center text-sm ${
                  txStatus === 'confirmed' ? 'bg-green-900/30 border border-green-500/50 text-green-300' :
                  txStatus === 'failed' ? 'bg-red-900/30 border border-red-500/50 text-red-300' :
                  'bg-blue-900/30 border border-blue-500/50 text-blue-300'
                }`}>
                  {txStatus === 'pending' && '⏳ Transaction pending...'}
                  {txStatus === 'confirmed' && '✅ Purchase successful! Unlocking features...'}
                  {txStatus === 'failed' && '❌ Transaction failed'}
                </div>
              )}
            </div>
          </div>

          {/* About $SCORES */}
          <div className="bg-deepPurple rounded-lg p-4 border border-limeGreenOpacity">
            <h4 className="text-notWhite font-semibold mb-2 flex items-center gap-2">
              <FaUserTie className="text-fontRed" />
              Why $SCORES?
            </h4>
            <p className="text-xs text-lightPurple mb-2">
              $SCORES are your onchain Footy App Fan Pass. Early supporters get more benefits as the community grows.
            </p>
            <p className="text-xs text-gray-400">
              Use them to unlock exclusive features, deploy ScoreSquare games, and earn from the community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyScoresModal;
