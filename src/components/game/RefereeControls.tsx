'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { SCORE_SQUARE_ADDRESS } from '../../lib/config';
import { useGameContext } from '../../context/GameContext'; // ✅ Import Game Context
import FarcasterAvatar from '../FarcasterAvatar'; // ✅ adjust path if needed
import { fetchFarcasterProfileByAddress } from '../../utils/fetchFarcasterProfile'; // ✅ Make sure this is the correct path

interface RefereeControlsProps {
  gameId: number;
  squareOwners: (string | null)[];
  refetchOnChainTickets: () => Promise<void>;
  selectedWinners: { halftime: number | null; final: number | null };
  clearWinners: () => void;
}

const RefereeControls: React.FC<RefereeControlsProps> = ({
  gameId,
  squareOwners,
  refetchOnChainTickets,
  selectedWinners,
  clearWinners,
}) => {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [profiles, setProfiles] = useState<Record<string, { username: string; pfp: string }>>({});

  // ✅ Use game context instead of managing state separately
  const { gameDataState } = useGameContext();
  const ticketsSold = gameDataState?.ticketsSold ?? 0;

  const { writeContractAsync } = useWriteContract();

  // console.log("🟢 [RefereeControls] Rendering with gameId:", gameId);
  // console.log("🏟️ Game Data State:", gameDataState);
  // ✅ Use gameDataState instead of separate fetch
  const prizePool = gameDataState?.prizePool ?? BigInt(0);
  const prizeClaimed = gameDataState?.prizeClaimed ?? false;
  const isFinalized = Array.isArray(gameDataState?.winners) && gameDataState.winners.length > 0;
  const showDistributePrizes = isFinalized && prizePool > BigInt(0) && !prizeClaimed;
  // const deployerFeePercent = gameDataState?.deployerFeePercent ?? 0; // Extract deployer fee from state

// Convert fees from percentages to decimal values
// const communityFee = (Number(prizePool) * 4) / 100;
// const deployerFee = (Number(prizePool) * deployerFeePercent) / 100;

// Calculate final prize pool after fees
// const netPrizePool = Number(prizePool) - communityFee - deployerFee;


  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: txHash ? (txHash as `0x${string}`) : undefined,
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      const addresses = ['halftime', 'final']
        .map((key) => {
          const i = selectedWinners[key as 'halftime' | 'final'];
          return i !== null ? squareOwners[i] : null;
        })
        .filter((addr): addr is string => !!addr && addr !== '0x0000000000000000000000000000000000000000');
  
      const uniqueAddresses = [...new Set(addresses)];
  
      const profileUpdates: Record<string, { username: string; pfp: string }> = {};
      for (const address of uniqueAddresses) {
        if (!profiles[address]) {
          const profile = await fetchFarcasterProfileByAddress(address);
          profileUpdates[address] = {
            username: profile?.username ?? 'Anon',
            pfp: profile?.pfp?.url || '/defifa_spinner.gif',
          };
        }
      }
  
      if (Object.keys(profileUpdates).length > 0) {
        setProfiles((prev) => ({ ...prev, ...profileUpdates }));
      }
    };
  
    fetchProfiles();
  }, [selectedWinners, squareOwners]);
  
  useEffect(() => {
    if (isFinalized && !prizeClaimed) {
      // console.log("🔄 Re-fetching game data to ensure distribute button visibility...");
      refetchOnChainTickets();
    }
  }, [isFinalized, prizeClaimed]);
  
  useEffect(() => {
    if (isTxConfirmed) {
      setTxStatus('success');
      setTxHash(null);
      refetchOnChainTickets();
  
      setTimeout(() => {
        window.location.reload(); // 😬 less elegant, but works
      }, 1200);
    }
  }, [isTxConfirmed]);
  
  

  const formatScoreFromSquare = (index: number): string => {
    const home = Math.floor(index / 5);
    const away = index % 5;
    const format = (v: number) => (v === 4 ? '4+' : `${v}`);
    return `${format(home)} - ${format(away)}`;
  };
  
  // ✅ Finalize Game (Step 1)
  const handleFinalizeGame = async () => {
    try {
      const winners = [];
      if (selectedWinners.halftime !== null) winners.push(selectedWinners.halftime);
      if (selectedWinners.final !== null) winners.push(selectedWinners.final);

      if (winners.length === 0) {
        alert("⚠️ Please select at least one winner before finalizing.");
        return;
      }

      const winnerPercentages = winners.length === 1 ? [100] : [25, 75];

      // console.log("⏳ Finalizing game with winners:", winners, "Percentages:", winnerPercentages);
      setTxStatus("pending");

      const tx = await writeContractAsync({
        address: SCORE_SQUARE_ADDRESS as `0x${string}`,
        abi: [
          {
            name: "finalizeGame",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "gameId", type: "uint256" },
              { name: "winningSquares", type: "uint8[]" },
              { name: "winnerPercentages", type: "uint8[]" },
            ],
            outputs: [],
          },
        ],
        functionName: "finalizeGame",
        args: [BigInt(gameId), winners, winnerPercentages],
      });

      // console.log("✅ finalizeGame Transaction Submitted:", tx);
      setTxHash(tx);
    } catch (error) {
      console.error("❌ Error calling finalizeGame:", error);
      setTxStatus("error");
    }
  };

  // ✅ Distribute Winnings (Step 2)
  const handleDistributeWinnings = async () => {
    try {
      // console.log("⏳ Distributing winnings for gameId:", gameId);
      setTxStatus("pending");
  
      const tx = await writeContractAsync({
        address: SCORE_SQUARE_ADDRESS as `0x${string}`,
        abi: [
          {
            name: "distributeWinnings",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [{ name: "gameId", type: "uint256" }],
            outputs: [],
          },
        ],
        functionName: "distributeWinnings",
        args: [BigInt(gameId)],
      });
  
      // console.log("✅ distributeWinnings Transaction Submitted:", tx);
      setTxHash(tx);
    } catch (error) {
      console.error("❌ Error calling distributeWinnings:", error);
      setTxStatus("error");
    }
  };

  // ✅ Refund Functionality
  const handleRefundGame = async () => {
    try {
      setTxStatus("pending");

      const tx = await writeContractAsync({
        address: SCORE_SQUARE_ADDRESS as `0x${string}`,
        abi: [
          {
            name: "finalizeGame",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "gameId", type: "uint256" },
              { name: "winningSquares", type: "uint8[]" },
              { name: "winnerPercentages", type: "uint8[]" },
            ],
            outputs: [],
          },
        ],
        functionName: "finalizeGame",
        args: [BigInt(gameId), [], []],
      });

      setTxHash(tx);
    } catch (error) {
      console.error("❌ Error calling refund finalizeGame:", error);
      setTxStatus("error");
    }
  };

  const handleDistributeRefund = async () => {
    try {
      setTxStatus("pending");

      const tx = await writeContractAsync({
        address: SCORE_SQUARE_ADDRESS as `0x${string}`,
        abi: [
          {
            name: "distributeWinnings",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [{ name: "gameId", type: "uint256" }],
            outputs: [],
          },
        ],
        functionName: "distributeWinnings",
        args: [BigInt(gameId)],
      });

      setTxHash(tx);
    } catch (error) {
      console.error("❌ Error calling distribute refund:", error);
      setTxStatus("error");
    }
  };

  // console.log("🎯 showDistributePrizes:", showDistributePrizes);

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-yellow-500">
      <h3 className="text-xl font-bold text-notWhite mb-3">Referee Controls</h3>

      {txStatus === "pending" && <p className="text-limeGreenOpacity">⏳ Processing transaction...</p>}
      {txStatus === "success" && <p className="text-limeGreen">✅ Transaction confirmed!</p>}
      {txStatus === "error" && <p className="text-fontRed">❌ Transaction failed.</p>}

      {/* Show Refund Buttons if tickets sold are between 1 and 24 */}
      {!showDistributePrizes &&
        ticketsSold > 0 &&
        ticketsSold < 25 && (
          <>
            <p className="text-yellow-200 mb-2">
              ⚠️ This game has not sold out. You can still share the game link to encourage more entries.
              If the game doesn&apos;t fill, use the buttons below to refund all participants.
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={handleRefundGame}
                className="w-full py-2 px-4 rounded bg-indigo-700 text-white hover:bg-indigo-800"
              >
                Abort Game 1st
              </button>
              <button
                onClick={handleDistributeRefund}
                className="w-full py-2 px-4 rounded bg-yellow-700 text-white hover:bg-yellow-800"
              >
                Distribute Refunds 2nd
              </button>
            </div>
          </>
      )}

      {/* Show Finalize Game & Cancel Buttons if game is active */}
      {!showDistributePrizes && ticketsSold === 25 && (
        <>
          <div className="mb-4">
            {(selectedWinners.halftime !== null || selectedWinners.final !== null) && (
              <div>
                <p className="text-lightPurple font-semibold mb-2">Selected Winners:</p>
                <div className="grid grid-cols-2 gap-4">
                  {['halftime', 'final'].map((key) => {
                    const squareIndex = selectedWinners[key as 'halftime' | 'final'];
                    if (squareIndex === null) return null;
                    const address = squareOwners?.[squareIndex] ?? null;
                    // console.log("🏆 Selected Winner:", key, "Square Index:", squareIndex, "Address:", address);
                    return (
                      <div key={key} className="bg-gray-800 p-3 rounded-lg flex flex-col items-center space-y-2">
                        <FarcasterAvatar address={address || ''} size={40} className="min-w-[40px] min-h-[40px]" />
                        
                        <p className="text-lightPurple text-xs break-all text-center">
                          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
                        </p>
                    
                        <div className="text-center">
                          <p className="text-notWhite text-sm font-bold capitalize">{key}</p>
                          <p className="text-yellow-400 text-xs">Square #{squareIndex}</p>
                          <p className="text-lightPurple text-xs">{formatScoreFromSquare(squareIndex)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <span className="text-lightPurple">
              Select the halftime score first, then the final score. If the same score at the end of each half, only select one square.
            </span>
          </div>
          <button
            onClick={handleFinalizeGame}
            className="w-full py-2 px-4 rounded mt-4 bg-deepPink text-white hover:bg-fontRed transition-colors"
          >
            Finalize Game
          </button>

          <button
            onClick={clearWinners}
            className="w-full py-2 px-4 rounded mt-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </>
      )}

      {/* ✅ Show Distribute Prizes Button once game is finalized */}
      {showDistributePrizes && (
        <button
          onClick={handleDistributeWinnings}
          className="w-full py-2 px-4 rounded mt-4 bg-green-600 text-white hover:bg-green-700 transition-colors"
          disabled={txStatus === "pending"}
        >
          {txStatus === "pending" ? "Distributing..." : "Distribute Prizes"}
        </button>
      )}
    </div>
  );
};

export default RefereeControls;
