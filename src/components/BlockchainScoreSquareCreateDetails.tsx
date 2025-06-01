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

/**
 * Creates a composite event ID for the game
 * @param sportId - League/cup identifier from sportsData (e.g., "eng.1", "uefa.champions")
 * @param homeTeam - Home team name
 * @param awayTeam - Away team name
 * @param matchId - Optional ESPN match ID for reference
 * @returns Formatted eventId string
 */
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
  const [selectedSportId, setSelectedSportId] = useState<string>(sportId);
  const [latestSportId, setLatestSportId] = useState(selectedSportId);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockchainEventId, setBlockchainEventId] = useState<string>("");
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);

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
    <div className="bg-purplePanel rounded shadow-md max-w-md mx-auto">
      {/* Header with Toggle Button for Instructions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-notWhite text-center m-2">
          Create Game 
        </h2>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-sm text-fontRed hover:text-deepPink focus:outline-none"
        >
          <Info className="inline w-5 h-5" /> {showInstructions ? "Hide" : "Show"} Instructions
        </button>
      </div>

      {/* Conditionally Render Instructions */}
      {showInstructions && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-lg">
          <UserInstructions />
        </div>
      )}

      
      {message && <div className="mb-4 text-sm text-center text-green-500">{message}</div>}
      {error && (
        <div className="mb-4 text-sm text-center text-red-500">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
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
      
      <form onSubmit={handleSubmit} className="space-y-4 bg-darkPurple p-4 rounded">
        <div>
          <label className="block font-medium mb-1 text-notWhite">League/Competition:</label>
          <select 
            value={selectedSportId}
            onChange={(e) => {
              // Even though there's only one option, we keep the handler to maintain consistency
              setSelectedSportId(e.target.value);
              setSelectedMatchId(""); // Reset selected match when changes
              setHomeTeam("");
              setAwayTeam("");
              setBlockchainEventId(""); // Reset event ID when changes
            }}
            className="border border-limeGreenOpacity p-2 rounded w-full bg-darkPurple text-lightPurple"
            required
          >
            <option value="fifa.worldq.afc">World Cup Qualifiers (Asia)</option>
            <option value="fifa.worldq.conmebol">World Cup Qualifiers (S.America)</option>
            <option value="fifa.worldq.uefa">World Cup Qualifiers (Europe)</option>
            <option value="fifa.worldq.concacaf">World Cup Qualifiers (N.America)</option>
            <option value="fifa.worldq.caf">World Cup Qualifiers (Africa)</option>
          </select>
        </div>
        
        <div>
          <label className="block font-medium mb-1 text-notWhite">Select Match:</label>
          {eventsLoading ? (
            <div className="text-center p-2 text-lightPurple">Loading matches...</div>
          ) : availableMatches.length === 0 ? (
            <div className="text-center p-2 text-lightPurple">No matches available</div>
          ) : (
            <select 
              value={selectedMatchId}
              onChange={(e) => {
                setSelectedMatchId(e.target.value);
                setBlockchainEventId(""); // ✅ Reset event ID
              }}
              className="border border-limeGreenOpacity p-2 rounded w-full bg-darkPurple text-lightPurple"
            >
              <option value="">-- Select a match --</option>
              {availableMatches.map(match => (
                <option key={match.id} value={match.id}>
                  {match.homeTeam} vs {match.awayTeam} - {formatDate(match.date)}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {selectedMatchId && (
          <div className="p-3 bg-indigo-900 rounded">
            <div className="flex justify-between items-center mb-2">
              <div className="text-notWhite font-medium">{homeTeam}</div>
              <div className="text-notWhite">vs</div>
              <div className="text-notWhite font-medium">{awayTeam}</div>
            </div>
            <div className="text-xs text-lightPurple text-center">
              {formatDate(availableMatches.find(m => m.id === selectedMatchId)?.date || '')}
            </div>
          </div>
        )}
        
        {!selectedMatchId && (
          <>
            <div>
              <label className="block font-medium mb-1 text-notWhite">Home Team:</label>
              <input 
                type="text" 
                value={homeTeam} 
                onChange={(e) => setHomeTeam(e.target.value)} 
                className="border border-limeGreenOpacity p-2 rounded w-full bg-darkPurple text-lightPurple" 
                required 
                placeholder="Enter home team name manually"
              />
            </div>
            
            <div>
              <label className="block font-medium mb-1 text-notWhite">Away Team:</label>
              <input 
                type="text" 
                value={awayTeam} 
                onChange={(e) => setAwayTeam(e.target.value)} 
                className="border border-limeGreenOpacity p-2 rounded w-full bg-darkPurple text-lightPurple" 
                required 
                placeholder="Enter away team name manually"
              />
            </div>
          </>
        )}
        
        <div>
          <label className="block font-medium mb-1 text-notWhite">Square Price (ETH):</label>
          <input 
            type="text" 
            value={squarePrice} 
            onChange={(e) => setSquarePrice(e.target.value)} 
            className="border border-limeGreenOpacity p-2 rounded w-full bg-darkPurple text-lightPurple" 
            required 
          />
        </div>
        
      <div className="hidden">
          <label className="block font-medium mb-1 text-notWhite">Referee Address:</label>
          <input 
            type="text" 
            value={referee} 
            onChange={(e) => setReferee(e.target.value)} 
            placeholder="0x..." 
            className="border border-limeGreenOpacity p-2 rounded w-full bg-darkPurple text-lightPurple" 
            required 
          />
      </div>
        
        <div>
          <label className="block font-medium mb-1 text-notWhite">Deployer Fee (% of pot):</label>
          <select 
            value={deployerFeePercent} 
            onChange={(e) => setDeployerFeePercent(Number(e.target.value))} 
            className="border border-limeGreenOpacity p-2 rounded w-full bg-darkPurple text-lightPurple" 
            required
          >
            {[...Array(10)].map((_, i) => (
              <option key={i} value={i + 1}>{i + 1}%</option>
            ))}
          </select>
        </div>
        
        {blockchainEventId && (
          <div className="p-2 bg-indigo-900 rounded text-xs">
            <p className="font-bold text-white">Generated Event ID:</p>
            <p className="text-lightPurple break-all">{blockchainEventId}</p>
          </div>
        )}
        
        <div className="text-xs text-gray-400 mt-2">
          <p>Note: 4% community fee goes into treasury</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-notWhite">
  <input
    type="checkbox"
    id="acknowledge"
    checked={instructionsAcknowledged}
    onChange={(e) => setInstructionsAcknowledged(e.target.checked)}
    className="accent-deepPink w-4 h-4"
  />
  <label htmlFor="acknowledge">
    I’ve read and understand the game creation instructions and my role as the referee.
  </label>
</div>

        <button 
          type="submit" 
          disabled={loading || isConfirming || !address || (!homeTeam && !awayTeam) || !instructionsAcknowledged}
          className={`w-full px-4 py-2 rounded ${
            loading || isConfirming || !address || (!homeTeam && !awayTeam)
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
                : 'Deploy Game'}
        </button>
      </form>
    </div>
  );
};

export default BlockchainScoreSquareCreateDetails; 