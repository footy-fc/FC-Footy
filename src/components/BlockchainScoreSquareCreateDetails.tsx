/* eslint-disable */

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { Info } from 'lucide-react';
import { SCORE_SQUARE_ADDRESS } from '../lib/config';
import sportsData from './utils/sportsData';
import getTeamAbbreviation, { detectLeagueFromTeams } from './utils/teamAbbreviations';
import useEventsData from './utils/useEventsData';
import UserInstructions from './UserInstructions';
import { sdk } from "@farcaster/frame-sdk";

// ScoreSquare contract ABI (partial, only what we need for createGame)
const SCORE_SQUARE_ABI = [
  {
    name: 'createGame',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_squarePrice', type: 'uint256' },
      { name: '_eventId', type: 'string' },
      { name: '_referee', type: 'address' },
      { name: '_deployerFeePercent', type: 'uint8' }
    ],
    outputs: [{ name: 'gameId', type: 'uint256' }]
  },
  {
    name: 'getGame',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: [
      { 
        name: 'game',
        type: 'tuple',
        components: [
          { name: 'gameId', type: 'uint256' },
          { name: 'eventId', type: 'string' },
          { name: 'squarePrice', type: 'uint256' },
          { name: 'referee', type: 'address' },
          { name: 'deployerFeePercent', type: 'uint8' },
          { name: 'players', type: 'address[]' },
          { name: 'status', type: 'uint8' }
        ]
      }
    ]
  },
  {
    name: 'getGameIdByEventId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_eventId', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

function createCompositeEventId(sportId: string, homeTeam: string, awayTeam: string): string {
  const homeAbbr = getTeamAbbreviation(homeTeam);
  const awayAbbr = getTeamAbbreviation(awayTeam);

  const parts = sportId.split('.');
  let leaguePrefix = "";

  // Handle special cases like fifa.worldq.afc → fifa_worldq.afc
  if (parts[0] === 'fifa' && parts.length > 2) {
    leaguePrefix = parts.slice(0, 2).join('_') + '.' + parts.slice(2).join('.');
  } else {
    leaguePrefix = parts.join('_');
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${
    now.getDate().toString().padStart(2, '0')}${
    now.getHours().toString().padStart(2, '0')}${
    now.getMinutes().toString().padStart(2, '0')}${
    now.getSeconds().toString().padStart(2, '0')}`;

  return `${leaguePrefix}_${homeAbbr}_${awayAbbr}_${timestamp}`;
}

interface BlockchainScoreSquareCreateDetailsProps {
  home: string;
  away: string;
  sportId?: string; // Add sportId from sportsData.ts
  onGameCreated: (contractGameId: string, eventId: string, deployerFee: number, refereeAddress: string) => void;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  date: string;
  status: string;
}

const BlockchainScoreSquareCreateDetails: React.FC<BlockchainScoreSquareCreateDetailsProps> = ({ 
  home, 
  away, 
  sportId = "eng.1", // Default to EPL if not specified
  onGameCreated 
}) => {
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState<boolean>(false);
  const [homeTeam, setHomeTeam] = useState<string>(home);
  const [awayTeam, setAwayTeam] = useState<string>(away);
  const [squarePrice, setSquarePrice] = useState<string>("0.001");
  const [deployerFeePercent, setDeployerFeePercent] = useState<number>(4);
  const [referee, setReferee] = useState<string>("");
  // Restrict to EPL only for now, but keep as a dropdown for future leagues
  const [selectedSportId, setSelectedSportId] = useState<string>('eng.1');
  const [latestSportId, setLatestSportId] = useState(selectedSportId);
  const [ethUsdPrice, setEthUsdPrice] = useState<number>(0);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockchainEventId, setBlockchainEventId] = useState<string>("");
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentFid, setCurrentFid] = useState<number | null>(null);

  const { address } = useAccount();
  const { events, loading: eventsLoading, error: eventsError } = useEventsData(selectedSportId);
  // console.log("🏀 Available Matches:", events);

  // Add the useWriteContract hook
  const { writeContractAsync } = useWriteContract();
  
  // Add the useWaitForTransactionReceipt hook
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  useEffect(() => {
    if (events && events.length > 0) {
      const matches: Match[] = events.map(event => {
        const competitors = event.competitions[0]?.competitors || [];
  
        // ✅ Ensure we correctly type competitors
        const homeCompetitor = competitors.find((c: any) => c?.homeAway === "home");
        const awayCompetitor = competitors.find((c: any) => c?.homeAway === "away");
  
        return {
          id: event.id,
          homeTeam: homeCompetitor?.team.abbreviation || "Home",
          awayTeam: awayCompetitor?.team.abbreviation || "Away",
          homeTeamLogo: homeCompetitor?.team.logo || "",
          awayTeamLogo: awayCompetitor?.team.logo || "",
          date: event.date,
          status: event.status?.type?.detail || "Scheduled"
        };
      });
  
      setAvailableMatches(matches);
    }
  }, [events]);
  
  // Whenever `selectedSportId` changes, update `latestSportId`
  useEffect(() => {
    setLatestSportId(selectedSportId);
  }, [selectedSportId]);

  // Set referee to connected wallet address when address changes
  useEffect(() => {
    if (address && referee === "") {
      setReferee(address);
    }
  }, [address, referee]);

  // Fetch Farcaster FID for gating
  useEffect(() => {
    const loadFid = async () => {
      try {
        await sdk.actions.ready({});
        const context = await sdk.context;
        const fid = context?.user?.fid;
        if (typeof fid === 'number') setCurrentFid(fid);
      } catch {
        // ignore
      }
    };
    loadFid();
  }, []);

  const canDeploy = currentFid === 4163 || currentFid === 420564;

  const handleRequestReferee = async () => {
    try {
      await sdk.haptics.impactOccurred('medium');
    } catch {}
    try {
      await sdk.actions.composeCast({
        text: "Hey @kmacb.eth, I'd like to be a ScoreSquare referee on Footy.",
        embeds: [],
      });
    } catch (e) {
      console.error('composeCast failed:', e);
    }
  };

  // Fetch ETH -> USD price for display
  useEffect(() => {
    let cancelled = false;
    const fetchEthUsd = async () => {
      try {
        setPriceError(null);
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        if (!res.ok) throw new Error('Failed to fetch ETH price');
        const data = await res.json();
        if (!cancelled) {
          const price = Number(data?.ethereum?.usd || 0);
          if (price > 0) setEthUsdPrice(price);
        }
      } catch (e) {
        if (!cancelled) setPriceError('');
      }
    };
    fetchEthUsd();
    return () => { cancelled = true; };
  }, []);

  // Process events data to get available matches
  useEffect(() => {
    if (events && events.length > 0) {
      const matches: Match[] = events.map(event => {
        // Extract competitors from the first competition
        const competitors = event.competitions[0]?.competitors || [];
        const homeCompetitor = competitors.find(c => c.team?.id) || { team: { id: '', logo: '' }, score: 0 };
        const awayCompetitor = competitors.find(c => c.team?.id && c.team.id !== homeCompetitor.team.id) || { team: { id: '', logo: '' }, score: 0 };
        
        return {
          id: event.id,
          homeTeam: event.shortName.split(' @ ')[1] || event.shortName.split(' vs ')[0] || 'Home',
          awayTeam: event.shortName.split(' @ ')[0] || event.shortName.split(' vs ')[1] || 'Away',
          homeTeamLogo: homeCompetitor.team.logo,
          awayTeamLogo: awayCompetitor.team.logo,
          date: event.date,
          status: event.status?.type?.detail || 'Scheduled'
        };
      });
      
      setAvailableMatches(matches);
      
      // Clear selected match if it's no longer available
      if (selectedMatchId && !matches.some(match => match.id === selectedMatchId)) {
        setSelectedMatchId("");
        setHomeTeam("");
        setAwayTeam("");
      }
    } else {
      setAvailableMatches([]);
    }
  }, [events, selectedMatchId]);

  // Update home and away teams when a match is selected
  useEffect(() => {
    if (selectedMatchId) {
      const selectedMatch = availableMatches.find(match => match.id === selectedMatchId);
      if (selectedMatch) {
        setHomeTeam(selectedMatch.homeTeam);
        setAwayTeam(selectedMatch.awayTeam);
      }
    }
  }, [selectedMatchId, availableMatches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxHash("");
    setLoading(true);
    
    try {
      // Validate inputs
      if (!sportId) {
        throw new Error("Please select a sport");
      }
      
      if (!homeTeam) {
        throw new Error("Please enter a home team");
      }
      
      if (!awayTeam) {
        throw new Error("Please enter an away team");
      }
      
      // Validate square price
      const priceValue = parseFloat(squarePrice);
      if (isNaN(priceValue) || priceValue <= 0) {
        throw new Error("Please enter a valid square price");
      }
      
      // Validate referee address
      let finalRefereeAddress = referee;
      if (!finalRefereeAddress) {
        finalRefereeAddress = "0x0000000000000000000000000000000000000000"; // Zero address
      } else if (!isAddress(finalRefereeAddress)) {
        throw new Error("Please enter a valid referee address");
      }
      // console.log("[DEBUG] selectedSportId before event creation:", selectedSportId);

      // Create event ID - we no longer need to pass selectedMatchId since our timestamp is unique
      const eventId = createCompositeEventId(
        latestSportId,
        homeTeam,
        awayTeam
      );
      
      // console.log("Event ID:", eventId);
      setBlockchainEventId(eventId);
      
      // Check if wallet is connected
      if (!address) {
        throw new Error("Please connect your wallet");
      }
      
      // Convert square price to wei
      const squarePriceWei = parseEther(squarePrice);
      
      // Use wagmi's writeContractAsync instead of manual wallet client
      const hash = await writeContractAsync({
        address: SCORE_SQUARE_ADDRESS as `0x${string}`,
        abi: SCORE_SQUARE_ABI,
        functionName: 'createGame',
        args: [squarePriceWei, eventId, finalRefereeAddress as `0x${string}`, deployerFeePercent],
      });
      
      console.log("Transaction hash:", hash);
      setTxHash(hash);
      
      // The transaction confirmation will be handled by the useWaitForTransactionReceipt hook
      // When isConfirmed becomes true, we'll call finalizeGameCreation
    } catch (error) {
      console.error("Error creating game:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      setLoading(false);
    }
  };

  // Use the isConfirmed state to trigger finalizeGameCreation
  useEffect(() => {
    if (isConfirmed && txHash) {
      finalizeGameCreation(txHash);
    }
  }, [isConfirmed, txHash]);

  // Get block explorer URL based on network
  const getBlockExplorerUrl = () => {
    // This is a simplified version - in production, you'd detect the network
    return "https://basescan.org";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Finalize game creation after transaction is confirmed
  const finalizeGameCreation = async (txHash: string) => {
    try {
      setMessage("Transaction confirmed! Game created successfully!");
      
      // Get the event ID from the transaction logs
      const eventId = blockchainEventId;
      
      // Call the onGameCreated callback with the game ID and event ID
      onGameCreated(txHash, eventId, deployerFeePercent, referee);
      
      // Reset form
      setHomeTeam("");
      setAwayTeam("");
      setSelectedMatchId("");
      setBlockchainEventId("");
      
      // Keep the success message visible
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Error finalizing game creation:", error);
      setError("Failed to save game data after blockchain confirmation.");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl text-notWhite font-bold">Create Game</h1>
      </div>
      <div className="rounded-lg shadow-lg max-w-md mx-auto border border-purplePanel bg-purplePanel p-4">
        {/* Header with Toggle Button for Instructions */}
        {/* Modal for Instructions */}
        {showInstructions && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="p-4 rounded shadow-lg max-w-md w-full">
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="text-sm text-lightPurple hover:text-notWhite focus:outline-none float-right mr-2 mt-2"
              >
                X
              </button>
              <UserInstructions />
            </div>
          </div>
        )}

        {message && <div className="mb-4 text-sm text-center text-green-500">{message}</div>}
        {!canDeploy && (
          <div className="mb-4 text-sm text-center text-yellow-500">
            Only approved referees can create games.
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm text-center text-deepPink">
            <p className="font-bold">Error:</p>
            <p>Something went wrong. Transaction rejected.</p>
            {error.includes("not been authorized") && (
              <p className="mt-2 text-yellow-400">
                Please check your wallet and approve the transaction request. Make sure you&apos;re connected to the Base network.
              </p>
            )}
          </div>
        )}
        {eventsError && <div className="mb-4 text-sm text-center text-yellow-500">Warning: {eventsError}</div>}

        {txHash && (
          <div className="mb-4 text-sm text-center text-blue-500">
            {isConfirming ? "Confirming transaction..." : "Transaction submitted!"} 
            <a 
              href={`${getBlockExplorerUrl()}/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 underline"
            >
              View on Explorer
            </a>
          </div>
        )}
        {!canDeploy ? (
          <div className="p-3 bg-gray-800/60 border border-gray-700 rounded text-center text-sm text-lightPurple space-y-3">
            <div>
              You don’t have permission to create ScoreSquare games. Please contact an admin to be added as a referee.
            </div>
            <button
              type="button"
              onClick={handleRequestReferee}
              className="inline-flex items-center justify-center px-4 py-2 rounded bg-deepPink hover:bg-fontRed text-white"
            >
              Request referee access
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-notWhite font-semibold mb-1">League/Competition:</label>
          <select
            value={selectedSportId}
            onChange={(e) => {
              setSelectedSportId(e.target.value);
              setSelectedMatchId("");
              setHomeTeam("");
              setAwayTeam("");
              setBlockchainEventId("");
            }}
            className="bg-darkPurple text-lightPurple border border-limeGreenOpacity p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-limeGreenOpacity"
          >
            <option className="text-lightPurple" value="eng.1">Premier League (EPL)</option>
            <option className="text-lightPurple" value="esp.1">La Liga (ESP)</option>
            <option className="text-lightPurple" value="ita.1">Serie A (ITA)</option>
            <option className="text-lightPurple" value="ger.1">Bundesliga (GER)</option>
            <option className="text-lightPurple" value="fra.1">Ligue 1 (FRA)</option>
            <option className="text-lightPurple" value="uefa.champions">UEFA Champions League</option>
            <option className="text-lightPurple" value="uefa.europa">UEFA Europa League</option>
            <option className="text-lightPurple" value="usa.1">MLS (USA)</option>
            <option className="text-lightPurple" value="eng.2">EFL Championship (ENG 2)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-notWhite font-semibold mb-1">Select Match:</label>
          {eventsLoading ? (
            <div className="text-center p-2 text-lightPurple">Loading matches...</div>
          ) : availableMatches.length === 0 ? (
            <div className="text-center p-2 text-lightPurple">No matches available</div>
          ) : (
            <select 
              value={selectedMatchId}
              onChange={(e) => {
                setSelectedMatchId(e.target.value);
                setBlockchainEventId("");
              }}
              className="bg-darkPurple text-lightPurple border border-limeGreenOpacity p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-limeGreenOpacity"
            >
              <option className="text-lightPurple" value="">-- Select a match --</option>
              {availableMatches.map(match => (
                <option className="text-lightPurple" key={match.id} value={match.id}>
                  {match.homeTeam} vs {match.awayTeam} - {formatDate(match.date)}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div>
          <label className="block text-notWhite font-semibold mb-1">Square Price (ETH):</label>
          <input 
            type="text" 
            value={squarePrice} 
            onChange={(e) => setSquarePrice(e.target.value)} 
            className="bg-darkPurple text-lightPurple border border-limeGreenOpacity p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-limeGreenOpacity" 
            required 
          />
          {ethUsdPrice > 0 && !Number.isNaN(parseFloat(squarePrice)) && (
            <div className="mt-1 text-xs text-gray-400">
              ≈ ${ (parseFloat(squarePrice || '0') * ethUsdPrice).toFixed(2) } USD
            </div>
          )}
        </div>
        
      <div className="hidden">
          <label className="block text-notWhite font-semibold mb-1">Referee Address:</label>
          <input 
            type="text" 
            value={referee} 
            onChange={(e) => setReferee(e.target.value)} 
            placeholder="0x..." 
            className="bg-darkPurple text-lightPurple border border-limeGreenOpacity p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-limeGreenOpacity" 
            required 
          />
      </div>
        
        <div>
          <label className="block text-notWhite font-semibold mb-1">Deployer Fee (% of pot):</label>
          <select 
            value={deployerFeePercent} 
            onChange={(e) => setDeployerFeePercent(Number(e.target.value))} 
            className="bg-darkPurple text-lightPurple border border-limeGreenOpacity p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-limeGreenOpacity" 
            required
          >
            {[...Array(10)].map((_, i) => (
              <option className="text-lightPurple" key={i} value={i + 1}>{i + 1}%</option>
            ))}
          </select>
        </div>
        
        {blockchainEventId && (
          <div className="p-2 bg-gray-700 rounded text-xs">
            <p className="font-bold text-white">Event ID:</p>
            <p className="text-lightPurple break-all">{blockchainEventId}</p>
          </div>
        )}
        
        <div className="text-xs text-gray-400 mt-2">
          <p>Note: 4% community fee goes into treasury</p>
        </div>
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-sm text-deepPink hover:text-fontRed focus:outline-none"
        >
          <Info className="inline w-5 h-5" /> {showInstructions ? "Hide" : "Show"} Instructions
        </button>
        <div className="flex items-center gap-2 text-sm text-notWhite">
          <input
            type="checkbox"
            id="acknowledge"
            checked={instructionsAcknowledged}
            onChange={(e) => setInstructionsAcknowledged(e.target.checked)}
            className="accent-deepPink w-4 h-4"
          />
          <label htmlFor="acknowledge">
            I understand the game and my responsibilities as the referee.
          </label>
        </div>

      <button 
          type="submit"
          onClick={async () => {
            try {
              await sdk.haptics.impactOccurred('medium');
            } catch {
              // ignore haptics errors
            }
          }}
          disabled={loading || isConfirming || !address || (!homeTeam && !awayTeam) || !instructionsAcknowledged || !canDeploy}
          className={`w-full px-4 py-2 rounded font-semibold ${
            loading || isConfirming || !address || (!homeTeam && !awayTeam) || !canDeploy
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-deepPink hover:bg-fontRed'
          } text-white`}
        >
          {loading 
            ? 'Processing...' 
            : isConfirming 
              ? 'Confirming Transaction...'
              : !address 
                ? 'Connect Wallet to Deploy' 
                : !canDeploy
                  ? 'Not Authorized'
                  : 'Deploy Game'}
        </button>
        </form>
        )}
      </div>
    </>
  );
};

export default BlockchainScoreSquareCreateDetails; 