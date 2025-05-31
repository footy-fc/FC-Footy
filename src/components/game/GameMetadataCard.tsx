/* eslint-disable */
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getTeamLogo, getLeagueDisplayName } from '../utils/fetchTeamLogos';
import { parseEventId } from '../../utils/eventIdParser';
import { useGameContext } from '../../context/GameContext';
import { FaTicketAlt, FaTrophy } from "react-icons/fa";
import RefereeIcon from '../ui/RefereeIcon';
import FarcasterAvatar from '../FarcasterAvatar';
import { fetchNativeTokenPrice } from '~/utils/fetchUsdPrice';

interface GameMetadataCardProps {
  derivedPlayers: (string | null)[];
}

const GameMetadataCard: React.FC<GameMetadataCardProps> = ({ derivedPlayers }) => {
  const { gameDataState, homeScore, awayScore, gameClock, gameStatus, winnerProfiles } = useGameContext();
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  
    useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await fetchNativeTokenPrice('base');
        setEthPrice(price);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(null);
        // Consider adding retry logic here
      }
    };
    
    fetchPrice();
  }, []);
  
  if (!gameDataState || !gameDataState.eventId) {
    return (
      <div className="p-6 bg-darkPurple rounded-lg text-notWhite text-center border border-gray-700 shadow-md">
        <p>No game data available.</p>
      </div>
    );
  }

  const eventDetails = parseEventId(gameDataState.eventId);
  const leagueId = eventDetails?.leagueId || 'default.league';
  const homeTeam = eventDetails?.homeTeam || 'UNK';
  const awayTeam = eventDetails?.awayTeam || 'UNK';
  const { ticketsSold, prizeClaimed, refunded, winners, squarePrice, deployerFeePercent } = gameDataState;
  const ticketPrice = squarePrice ? Number(squarePrice) / 1e18 : 0;
  // console.log('gameDataState', gameDataState);

  const shareUrl = `https://147585e1f72a.ngrok.app/?tab=moneyGames&gameType=scoreSquare&eventId=${gameDataState.eventId}`;
  // console.log('shareUrl', shareUrl);
  
  // Encode the URL for use in both warpcast links
  const encodedShareUrl = encodeURIComponent(shareUrl);
  
  // Warpcast Frame Launcher URL
  const warpcastUrl = `https://warpcast.com/~/launch/frames?url=${encodedShareUrl}`;
  // console.log('warpcastUrl', warpcastUrl);
  
  // Optional: custom cast message
  //const text = encodeURIComponent("Check out this Score Square game 👇");
  
  // Warpcast Cast Intent with embed
  //const castIntentUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${encodedShareUrl}`;
  // console.log('castIntentUrl', castIntentUrl);
  
  // Cast intent that embeds the Warpcast frame launcher
  //const encodedWarpcastUrl = encodeURIComponent(warpcastUrl);
  //const launcherCastIntentUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${encodedWarpcastUrl}`;
  // console.log("launcherCastIntentUrl", launcherCastIntentUrl);
  //const castIntentUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${encodedShareUrl}`;
  //const launchLastTry = `https://warpcast.com/~/frames/launch?url=${encodedShareUrl}`;
  //console.log( "launchLastTry", launchLastTry);
  const totalPrizePool = 25 * ticketPrice;
  const communityFee = (totalPrizePool * 4) / 100;
  const refereeFee = (totalPrizePool * deployerFeePercent) / 100;
  const netPrizePool = totalPrizePool - communityFee - refereeFee;
  const usdPrizePool = ethPrice ? netPrizePool * ethPrice : null;


  const displayHomeScore = homeScore !== undefined && homeScore !== null ? homeScore : '-';
  const displayAwayScore = awayScore !== undefined && awayScore !== null ? awayScore : '-';

  let gameStatusLabel = "Unknown";
  if (refunded) gameStatusLabel = "🔄 Refunded";
  else if (prizeClaimed) gameStatusLabel = "✅ Game Completed";
  else if (ticketsSold >= 25) gameStatusLabel = "⏳ Waiting on Referee";
  else gameStatusLabel = "🟢 Tickets Available";

const sortedWinners =
  Array.isArray(winners) && winners.length > 0
    ? [...winners].sort((a, b) => b.percentage - a.percentage)
    : [];

const finalWinner = sortedWinners[0] || null;
const halftimeWinner = sortedWinners[1] || null;
//const thirdPlaceWinner = sortedWinners[2] || null;


  const formatScore = (squareIndex: number | null) => {
    if (squareIndex === null) return "N/A";
    const home = Math.floor(squareIndex / 5);
    const away = squareIndex % 5;
    return `${home}-${away === 4 ? "4+" : away}`;
  };

  const getWinnerAddress = (squareIndex: number | null) => {
    if (squareIndex === null) return "N/A";
    return derivedPlayers[squareIndex] || "Unknown";
  };

  const getWinnerProfile = (address: string) => {
    return winnerProfiles[address] || { username: address.slice(0, 6) + "..." + address.slice(-4), pfp: "/defifa_spinner.gif" };
  };

  const WinnerCard = ({ winner, label }: { winner: any; label: string }) => {
    if (!winner) return null;
    const address = getWinnerAddress(winner.squareIndex);
    const profile = getWinnerProfile(address);

return (
  <a
    href={`https://basescan.org/address/${address}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-between text-sm mt-2 border-b border-gray-700 pb-2 last:border-0"
  >
    <span className="text-xs text-gray-400">{label}:</span>
    <span className="text-white">{formatScore(winner.squareIndex)} - {winner.percentage}%</span>
    
    <div className="flex items-center gap-2">
      {/* ✅ Display winner’s profile picture */}
      <FarcasterAvatar address={address} size={32} className="mb-1" />
      
      {/* ✅ Show username next to the avatar */}
      <span className="truncate max-w-[100px] text-gray-300 text-xs">{profile.username}</span>
    </div>
  </a>
);

  };

  return (
    <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-lg p-6 border border-limeGreenOpacity max-w-lg mx-auto">
      <div className="text-center mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">{getLeagueDisplayName(leagueId)}</p>
        <p className="text-lg font-semibold text-limeGreen">{gameStatusLabel}</p>
      </div>

      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4 shadow-md">
        <div className="flex flex-col items-center">
          <Image src={getTeamLogo(homeTeam, leagueId)} alt={homeTeam} width={50} height={50} />
          <span className="text-lg font-semibold text-white">{homeTeam}</span>
        </div>

        <div className="text-center">
          <span className="text-3xl font-bold text-white">{displayHomeScore} - {displayAwayScore}</span>
          <p className="text-xs text-gray-400">{gameClock} | {gameStatus}</p>
        </div>

        <div className="flex flex-col items-center">
          <Image src={getTeamLogo(awayTeam, leagueId)} alt={awayTeam} width={50} height={50} />
          <span className="text-lg font-semibold text-white">{awayTeam}</span>
        </div>
      </div>

      <div className="mt-4 bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-start text-notWhite text-md font-bold border-b border-gray-700 pb-2">
  <div className="flex items-center gap-2">
    <FaTrophy className="text-orange-400" />
    <p>Prize Pool:</p>
  </div>
  <div className="flex flex-col items-end -mt-1">
    <p className="text-limeGreenOpacity">{netPrizePool.toFixed(3)} Ξ</p>
    <div className="text-xs text-gray-400 mt-0.5">
      {usdPrizePool !== null ? (
        `~$${usdPrizePool.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`
      ) : (
        <span className="text-gray-500">$</span>
      )}
    </div>
  </div>
</div>

        <div className="flex justify-between items-center text-notWhite text-sm mt-3">
          <div className="flex items-center gap-2">
            <FaTicketAlt className="text-blue-400" />
            <p>Ticket Price:</p>
          </div>
          <p className="text-lightPurple">{ticketPrice.toFixed(4)} Ξ</p>
        </div>

        <div className="flex justify-between items-center text-notWhite text-sm mt-2">
          <div className="flex items-left">
            <RefereeIcon size={20} />
            <p>Referee bonus:</p>
          </div>
          <p className="text-deepPink">({refereeFee.toFixed(4)} Ξ)</p>
        </div>

        <div className="flex justify-between items-center text-notWhite text-sm mt-2">
          <p>🛠️ Community 4%:</p>
          <p className="text-deepPink">({communityFee.toFixed(4)} Ξ)</p>
        </div>
      </div>
      {(finalWinner || halftimeWinner ) && (
        <div className="mt-4 bg-gray-900 p-4 rounded-lg shadow-md border border-yellow-500">
          <h4 className="text-md font-semibold text-yellow-400 text-center mb-2">🏅 Winners</h4>
          {finalWinner && <WinnerCard winner={finalWinner} label="🏆 FT" />}
          {halftimeWinner && <WinnerCard winner={halftimeWinner} label="🥈 HT" />}
          {/* {thirdPlaceWinner && <WinnerCard winner={thirdPlaceWinner} label="🥉 Third" />} */}
        </div>
      )}


    </div>
  );
};

export default GameMetadataCard;
