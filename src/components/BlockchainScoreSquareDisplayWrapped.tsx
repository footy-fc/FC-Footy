import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useContractRead } from 'wagmi';
import { toPng } from 'html-to-image';
import { useGameContext } from '../context/GameContext';
import GameMetadataCard from './game/GameMetadataCard';
import SquareGrid from './game/SquareGrid';
import CartSection from './game/CartSection';
import LoadingSpinner from './game/LoadingSpinner';
import ErrorDisplay from './game/ErrorDisplay';
import NoGameData from './game/NoGameData';
import RefereeCard from './game/RefereeCard';
import RefereeControls from './game/RefereeControls';
import UserInstructions from './UserInstructions';
import { SCORE_SQUARE_ADDRESS } from '../lib/config';
import SquareGridPlaceholder from './game/SquareGridPlaceholder';
import { Info } from 'lucide-react';

interface BlockchainScoreSquareDisplayProps {
  eventId: string;
}

const ABI = [
  {
    name: "getAllTickets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [
      { name: "ticketNumbers", type: "uint8[]" },
      { name: "owners", type: "address[]" }
    ],
  },
  {
    name: "buyTickets",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "gameId", type: "uint256" }, { name: "numTickets", type: "uint8" }],
    outputs: [],
  },
  {
    name: "finalizeGame",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "winningSquares", type: "uint8[]" },
      { name: "winnerPercentages", type: "uint8[]" }
    ],
    outputs: [],
  },
  {
    name: "distribute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [],
  },
];

const BlockchainScoreSquareDisplayWrapped: React.FC<BlockchainScoreSquareDisplayProps> = ({ eventId }) => {
  const { gameDataState, loading, setLoading, error, setError } = useGameContext();
  const [pfpsLoaded, setPfpsLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [cart, setCart] = useState<number[]>([]);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [derivedPlayers, setDerivedPlayers] = useState<(string | null)[]>(Array(25).fill(null));
  const [selectedWinners, setSelectedWinners] = useState<{ halftime: number | null; final: number | null }>({
    halftime: null,
    final: null,
  });
  const [forceUpdate, setForceUpdate] = useState(0);
  const isGameDataReady = !!gameDataState && gameDataState.gameId !== undefined;
  const [delayedLoadComplete, setDelayedLoadComplete] = useState(false);

  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const { isLoading: isTxPending, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: txHash ? (txHash as `0x${string}`) : undefined,
  });
  const metadataRef = useRef<HTMLDivElement>(null); 

  const isReferee = gameDataState?.referee?.toLowerCase() === address?.toLowerCase();
  const gameState = gameDataState
    ? gameDataState.refunded
      ? "cancelled"
      : gameDataState.prizeClaimed
      ? "completed"
      : gameDataState.ticketsSold > 0
      ? "waiting for VAR"
      : "active"
    : "loading";

  // Fetch on-chain tickets
  
  const { data: onChainTickets, refetch: refetchOnChainTickets } = useContractRead({
    address: SCORE_SQUARE_ADDRESS as `0x${string}`,
    abi: ABI,
    functionName: "getAllTickets",
    args: gameDataState?.gameId ? [gameDataState.gameId] : undefined,
  });
  

  function isTicketTuple(value: unknown): value is [number[], string[]] {
    return (
      Array.isArray(value) &&
      value.length === 2 &&
      Array.isArray(value[0]) &&
      Array.isArray(value[1])
    );
  }
  
  const safeOnChainTickets = useMemo<[number[], string[]]>(() => {
    return isTicketTuple(onChainTickets) ? onChainTickets : [[], []];
  }, [onChainTickets]);
  
  

// Only debounce if a bunch of updates are expected — otherwise run immediately
const updatePlayers = (tickets: [number[], string[]]) => {
  if (!Array.isArray(tickets) || tickets.length !== 2) return;

  const [squareIndexes, buyers] = tickets;
  const updatedPlayers: (string | null)[] = Array(25).fill(null);

  squareIndexes.forEach((squareIndex, i) => {
    updatedPlayers[squareIndex] = buyers[i] || null;
  });

  setDerivedPlayers(updatedPlayers);
  setPfpsLoaded(true);
};

useEffect(() => {
  const noTicketsYet =
    safeOnChainTickets[0].length === 0 && safeOnChainTickets[1].length === 0;

  if (noTicketsYet) {
    setDerivedPlayers(Array(25).fill(null)); // ensure grid shows 25 empty squares
    setPfpsLoaded(true); // ✅ manually mark as ready so grid loads
    return;
  }

  updatePlayers(safeOnChainTickets);
}, [safeOnChainTickets]);

    
  useEffect(() => {
    if (safeOnChainTickets[0].length === 0 && safeOnChainTickets[1].length === 0) return;
    setForceUpdate(prev => prev + 1);
  }, [safeOnChainTickets]);
  
  useEffect(() => {
    if (!loading && eventId) {
      const timeout = setTimeout(() => {
        setDelayedLoadComplete(true);
      }, 500); // adjust as needed
  
      return () => clearTimeout(timeout);
    } else {
      setDelayedLoadComplete(false); // reset if loading again
    }
  }, [loading, eventId]);
  

  // ✅ FIXED: Prevent unnecessary re-renders
  useEffect(() => {
    if (isTxConfirmed) {
      setTxStatus("✅ Tickets successfully purchased!");
      setCart([]);
      setTimeout(() => setTxStatus(null), 5000);
    }
  }, [isTxConfirmed]);

  useEffect(() => {
    if (safeOnChainTickets[0].length === 0) return;
    updatePlayers(safeOnChainTickets);
  }, [safeOnChainTickets]);
  

  // ✅ FIXED: Ensure polling stops when needed
  useEffect(() => {
    if (!gameDataState || gameDataState.prizeClaimed) return;

    const interval = setInterval(() => {
      refetchOnChainTickets();
    }, 5000);

    return () => clearInterval(interval);
  }, [gameDataState?.prizeClaimed]);

  const handleBuyTickets = async () => {
    if (!gameDataState || cart.length === 0) {
      alert("Please select at least one square.");
      return;
    }

    try {
      setTxStatus("⏳ Waiting for wallet confirmation...");
      setLoadingStartTime(Date.now());

      const txResponse = await writeContractAsync({
        address: SCORE_SQUARE_ADDRESS as `0x${string}`,
        abi: ABI,
        functionName: "buyTickets",
        args: [BigInt(gameDataState.gameId), cart.length],
        value: BigInt(gameDataState.squarePrice) * BigInt(cart.length),
      });

      if (!txResponse) {
        throw new Error("❌ Transaction failed or was rejected.");
      }

      setTxHash(txResponse);
      setTxStatus("🚀 Transaction submitted! Waiting for confirmation...");
    } catch (error) {
      console.error("❌ Error in handleBuyTickets:", error);
      setTxStatus("❌ Transaction failed or rejected.");
    }
  };

const handleFinalizeRefund = async () => {
  if (!gameDataState) return;
  try {
    setTxStatus("Finalizing refund...");
    const txResponse = await writeContractAsync({
      address: SCORE_SQUARE_ADDRESS as `0x${string}`,
      abi: ABI,
      functionName: "finalizeGame",
      args: [[], []],
    });
    if (txResponse) setTxHash(txResponse);
  } catch (err) {
    console.error("Finalize refund failed:", err);
    setTxStatus("❌ Finalize refund failed.");
  }
};

const handleDistributeRefund = async () => {
  if (!gameDataState) return;
  try {
    setTxStatus("Distributing refund...");
    const txResponse = await writeContractAsync({
      address: SCORE_SQUARE_ADDRESS as `0x${string}`,
      abi: ABI,
      functionName: "distribute",
      args: [BigInt(gameDataState.gameId)],
    });
    if (txResponse) setTxHash(txResponse);
  } catch (err) {
    console.error("Distribute refund failed:", err);
    setTxStatus("❌ Distribute refund failed.");
  }
};

const handleShareClick = async () => {
  if (!gameDataState || !gameDataState.gameId) {
    alert("Game ID is not available.");
    return;
  }

  // Generate an image from the GameMetadataCard using html-to-image
  let imageUrl = "";
  if (metadataRef.current) {
    try {
      const dataUrl = await toPng(metadataRef.current, { cacheBust: true });
      // Convert the dataUrl to a blob
      const blob = await (await fetch(dataUrl)).blob();
      
      // Upload the blob to your image upload endpoint
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: blob,
      });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error('Image upload failed');
      
      // Construct the image URL (adjust the gateway URL as needed)
      
      imageUrl = encodeURIComponent(`https://tan-hidden-whippet-249.mypinata.cloud/ipfs/${uploadResult.ipfsHash}`);
    } catch (error) {
      console.error("Error generating image: ", error);
      alert("Failed to generate image for sharing.");
      return;
    }
  }

  // Construct the share URL as before
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?tab=moneyGames&gameType=scoreSquare&gameId=${gameDataState.gameId}`;
  
  
  const ticketsAvailable = gameDataState.ticketsSold !== undefined ? 25 - gameDataState.ticketsSold : 0;
  
  let fomoMessage = "Grab yours now before they're gone!";
  if (ticketsAvailable <= 5) {
    fomoMessage = "Hurry up, almost sold out!";
  }
  
  // Prepare the share text
  const funText = `⚽ Score Square - The Footy Final Score Lottery! ⚽

Don't miss out only ${ticketsAvailable} tickets remaining 
${fomoMessage}
Try your luck. Halftime score gets 25 percent of the pool, final score winner gets 75 percent.`;
  
  const text = encodeURIComponent(funText);
  console.log("Text to share: ", text);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  
  // Build the Warpcast intent URL including both the share URL and the generated image URL (if available)
  const castIntentUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${encodedShareUrl}${
    imageUrl ? `&embeds[]=${imageUrl}` : ''
  }`;
  
  window.open(castIntentUrl, '_blank');
};
// ... (rest of the file code)

  const isGridReady =
  gameDataState &&
  Array.isArray(derivedPlayers) &&
  derivedPlayers.length === 25 &&
  pfpsLoaded;

  const isGameMissing =
    delayedLoadComplete &&
    !!eventId &&
    (!gameDataState || !gameDataState.gameId);
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {error ? (
          <ErrorDisplay
            error={error}
            hasValidEventId={!!eventId}
            refreshGameData={refetchOnChainTickets}
          />
        ) : isGameMissing ? (
          <NoGameData
            refreshGameData={refetchOnChainTickets}
            message="Invalid eventID. Either KMac's testing boots got too close to the production pitch again, or another app took a shot with this contract. Either way... it's an own goal: -2 points. Blame KMac."
            contractAddress={SCORE_SQUARE_ADDRESS}
            hideRetryButton={true}
          />
        ) : !isGameDataReady ? (
          <div className="relative">
            <SquareGridPlaceholder />
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <LoadingSpinner
                gameDataState={gameDataState}
                loadingStartTime={loadingStartTime}
                setLoading={setLoading}
                setError={setError}
              />
            </div>
          </div>
        ) : (
          <div>
            <div ref={metadataRef}>
              <GameMetadataCard derivedPlayers={derivedPlayers} />
            </div>    
            {!isReferee && gameDataState.ticketsSold < 25 && (
              <RefereeCard referee={gameDataState.referee} />
            )}

            {txStatus && (
              <p className="text-center text-lg font-semibold text-blue-500">
                {txStatus}
              </p>
            )}
    
            {isReferee && gameState === "waiting for VAR" && gameDataState.ticketsSold === 25 && (
              <RefereeControls
                gameId={gameDataState.gameId}
                squareOwners={derivedPlayers}
                refetchOnChainTickets={() => refetchOnChainTickets().then(() => {})}
                selectedWinners={selectedWinners}
                clearWinners={() =>
                  setSelectedWinners({ halftime: null, final: null })
                }
              />
            )}
            {isReferee && gameState === "waiting for VAR" && (
              <div className="flex gap-2 mt-2 ml-6">
                <button
                  onClick={handleFinalizeRefund}
                  className="bg-indigo-700 text-white px-4 py-2 rounded-lg hover:bg-indigo-800"
                >
                  Abort Game 1st
                </button>
                <button
                  onClick={handleDistributeRefund}
                  className="bg-yellow-700 text-white px-4 py-2 rounded hover:bg-yellow-800"
                >
                  Distribute Refund 2nd
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 mb-2 ml-6">
              <Info className="w-5 h-5 text-deepPink" />

              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-deepPink hover:text-fontRed focus:outline-none transition font-medium"
              >
                {showInstructions ? "Hide Instructions" : "Show Instructions"}
              </button>

              {/* New Share Button */}
              <button
                onClick={handleShareClick}
                className="bg-deepPink text-white px-3 py-1 rounded hover:bg-fontRed transition font-medium"
              >
                Share
              </button>
            </div>

            {showInstructions && <UserInstructions />}


            {isGridReady ? (
              <SquareGrid
                key={forceUpdate}
                players={derivedPlayers}
                cart={cart}
                isReferee={isReferee}
                gameState={gameState}
                selectedWinners={selectedWinners}
                handleSquareClick={(index) => {
                  const isTaken = derivedPlayers[index] !== null;
                  if (!isTaken && !cart.includes(index)) {
                    setCart([...cart, index]);
                  }
                }}
                handleTapSquare={(index) => {
                  if (isReferee && gameState === "waiting for VAR") {
                    setSelectedWinners((prev) => {
                      if (prev.final === null) {
                        return { ...prev, final: index };
                      } else if (prev.halftime === null) {
                        return { ...prev, halftime: index };
                      } else {
                        return prev;
                      }
                    });
                  }
                }}
              />
            ) : (
              <div className="relative">
                <SquareGridPlaceholder />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <LoadingSpinner
                    gameDataState={gameDataState}
                    loadingStartTime={loadingStartTime}
                    setLoading={setLoading}
                    setError={setError}
                  />
                </div>
              </div>
            )}
    
            {gameDataState.ticketsSold < 25 && (
              <div className={isGridReady ? "" : "opacity-40 pointer-events-none"}>
                <CartSection
                  cart={cart}
                  squarePrice={BigInt(gameDataState.squarePrice || "0")}
                  handleBuyTickets={handleBuyTickets}
                  isBuying={isTxPending}
                  removeFromCart={(index) =>
                    setCart(cart.filter((i) => i !== index))
                  }
                  clearCart={() => setCart([])}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
     
};

export default BlockchainScoreSquareDisplayWrapped;