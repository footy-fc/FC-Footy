import React, { useCallback, useEffect, useState } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import { BASE_URL } from '~/lib/config';
import { useCommentator } from '~/hooks/useCommentator';
import { findMostSignificantEvent } from '~/utils/matchDataUtils';
import { RichMatchEvent } from '~/types/commentatorTypes';
import { CommentaryPipeline, CommentaryContext } from '~/services/CommentaryPipeline';

async function generateCompositeImage(
  homeLogo: string,
  awayLogo: string,
  homeScore: number,
  awayScore: number,
  clock: string
): Promise<string> {
  const purplePanel = "#010513"; 
  const textNotWhite = "#FEA282"; 
  
  const canvas = document.createElement('canvas');
  canvas.width = 480;  
  canvas.height = 320; // Adjusted to maintain 3:2 aspect ratio
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available.');

  ctx.fillStyle = purplePanel;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const [homeImg, awayImg] = await Promise.all([loadImage(homeLogo), loadImage(awayLogo)]);

  const logoSize = 160; 
  const logoY = (canvas.height - logoSize) / 2; 

  ctx.drawImage(homeImg, 0, logoY, logoSize, logoSize);
  ctx.drawImage(awayImg, canvas.width - logoSize, logoY, logoSize, logoSize);

  const centerX = logoSize;
  const centerWidth = canvas.width - 2 * logoSize; 
  ctx.fillStyle = purplePanel;
  ctx.fillRect(centerX, logoY, centerWidth, logoSize);

  ctx.fillStyle = textNotWhite;
  ctx.font = 'bold 48px Arial'; 
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rectCenterX = centerX + centerWidth / 2;
  const rectCenterY = logoY + logoSize / 2;

  const scoreText = `${homeScore} - ${awayScore}`;
  ctx.fillText(scoreText, rectCenterX, rectCenterY - 32);
  
  ctx.font = 'bold 24px Arial';

  let displayClock = clock;
  if (clock.startsWith("0'")) {
    const match = clock.match(/Sat, .* at \d{1,2}:\d{2} [AP]M [A-Z]+/);
    if (match) {
      const dateMatch = match[0].match(/([A-Za-z]+) (\d+)[a-z]{2} at (\d{1,2}:\d{2} [AP]M) ([A-Z]+)/);
      if (dateMatch) {
        const month = dateMatch[1];
        const day = dateMatch[2];
        const time = dateMatch[3];
        const tz = dateMatch[4];
        const shortDate = `${new Date(`${month} 1`).getMonth() + 1}/${day}`;
        displayClock = `${shortDate} at ${time} ${tz}`;
      }
    }
  } else {
    const parts = clock.trim().split(' ');
    if (parts.length === 2 && parts[0] === parts[1]) {
      displayClock = parts[0];
    }
  }

  ctx.fillText(displayClock, rectCenterX, rectCenterY + 100);

  // New code to load and draw the spinner image
  try {
    const spinnerImg = await loadImage('/assets/banny_background.png'); // Adjust the path to your spinner image
    const spinnerSize = 120; // Adjust spinner size as needed
    const spinnerX = (canvas.width - spinnerSize) / 2;
    const spinnerY = (canvas.height - spinnerSize) / 1.5;
    ctx.globalAlpha = 0.2; // Set partial transparency
    ctx.drawImage(spinnerImg, spinnerX, spinnerY, spinnerSize, spinnerSize);
    ctx.globalAlpha = 1; // Reset transparency
  } catch (error) {
    console.error("Error loading spinner image:", error);
  }

  return canvas.toDataURL('image/png');
}



interface SelectedMatch {
  competitorsLong: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  clock: string;
  homeLogo: string;
  awayLogo: string;
  eventStarted: boolean;
  keyMoments?: string[];
  // New rich data fields
  matchEvents?: RichMatchEvent[];
  competition?: string;
  eventId?: string;
}

interface WarpcastShareButtonProps {
  selectedMatch: SelectedMatch;
  targetElement?: HTMLElement | null;
  buttonText?: string;
  compositeImage?: boolean;
  fallbackLeague?: string;
  leagueId?: string;
  moneyGamesParams?: {
    eventId: string;
    gameId?: string;
  };
  ticketPriceEth?: number;
  prizePoolEth?: number;
}

export function WarpcastShareButton({ selectedMatch, buttonText, compositeImage, leagueId, moneyGamesParams, ticketPriceEth, prizePoolEth }: WarpcastShareButtonProps) {
  const { isGenerating, currentCommentator } = useCommentator();
  const [ethUsdPrice, setEthUsdPrice] = useState<number | null>(null);

  useEffect(() => {
    // Fetch ETH price when we are composing MoneyGames link so we can show USD affordance
    if (!moneyGamesParams) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await res.json();
        if (!cancelled) setEthUsdPrice(Number(data?.ethereum?.usd || 0));
      } catch {
        if (!cancelled) setEthUsdPrice(null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [moneyGamesParams]);

  const generateCommentaryForMatch = async (
    homeTeam: string,
    awayTeam: string,
    competition: string,
    matchEvents: RichMatchEvent[],
    homeScore: number,
    awayScore: number
  ): Promise<string> => {
    try {
      const significantEvent = findMostSignificantEvent(matchEvents);

      // Build flexible context for match sharing
      const context: CommentaryContext = {
        eventId: `match-${Date.now()}`,
        homeTeam,
        awayTeam,
        competition: competition || 'Football Match',
        eventType: significantEvent ? 'goal' : 'final_whistle',
        score: `${homeScore}-${awayScore}`,
        context: `Match between ${homeTeam} and ${awayTeam}`,
        // Match sharing context - only match events, no chat or FPL
        matchEvents: matchEvents?.map(event => ({
          type: { text: event.type?.text || '' },
          athletesInvolved: event.athletesInvolved || [],
          clock: { displayValue: event.clock?.displayValue || '' },
          action: undefined,
          playerName: event.athletesInvolved?.[0]?.displayName,
          time: event.clock?.displayValue
        })),
        currentScore: `${homeScore}-${awayScore}`,
        matchStatus: 'Final'
      };

      // Use the flexible pipeline for match sharing
      const response = await CommentaryPipeline.generateMatchSharingCommentary(
        'peter-drury', // Default commentator for match sharing
        context
      );

      return response.commentary;
    } catch (error) {
      console.error('Error generating commentary:', error);
      return '';
    }
  };

  const openWarpcastUrl = useCallback(async () => {
    // Stronger and more noticeable haptic feedback
    try {
      const capabilities = await sdk.getCapabilities();
      if (capabilities.includes('haptics.notificationOccurred')) {
        await sdk.haptics.notificationOccurred('error');
      } else if (capabilities.includes('haptics.impactOccurred')) {
        await sdk.haptics.impactOccurred('heavy');
      }
    } catch {
      // Ignore haptics errors
    }

    if (selectedMatch) {
      const frameUrlRaw = BASE_URL || 'https://fc-footy.vercel.app';
      const frameUrl = frameUrlRaw.startsWith('http') ? frameUrlRaw : `https://${frameUrlRaw}`;
      const {
        competitorsLong,
        homeScore,
        awayScore,
        clock,
        homeLogo,
        awayLogo,
        keyMoments,
        matchEvents,
        competition,
      } = selectedMatch;

      // Generate commentary if we have rich match data
      let commentary = '';
      if (matchEvents && matchEvents.length > 0 && !moneyGamesParams) {
        try {
          commentary = await generateCommentaryForMatch(
            selectedMatch.homeTeam,
            selectedMatch.awayTeam,
            competition || 'Football Match',
            matchEvents,
            homeScore,
            awayScore
          );
        } catch (error) {
          console.error('Failed to generate commentary:', error);
        }
      }

      const keyMomentsText = keyMoments && keyMoments.length > 0
        ? `\n\nKey Moments:\n${keyMoments.join('\n')}`
        : "";

      const search = new URLSearchParams();

      if (moneyGamesParams) {
        search.set("tab", "moneyGames");
        search.set("gameType", "scoreSquare");
        search.set("gameState", "active");
        search.set("eventId", moneyGamesParams.eventId);
        if (moneyGamesParams.gameId) {
          search.set("gameId", moneyGamesParams.gameId);
        }
        if (leagueId) {
          search.set("league", leagueId);
        }
      } else {
        search.set("tab", "matches");
        if (leagueId) {
          search.set("league", leagueId);
        }
      }

      const currentQuery = search.toString() ? `?${search.toString()}` : "";

      // Build the base mini app URL from frameUrl and current query string.
      const miniAppUrl = `${frameUrl}${currentQuery}`;

      // Build the cast text
      const isMoneyGame = Boolean(moneyGamesParams);
      let matchSummary = `${competitorsLong} ${keyMomentsText}\n\n@gabedev.eth @kmacb.eth are you in on this one?`;
      
      if (isMoneyGame) {
        const ticketEthStr = typeof ticketPriceEth === 'number' && !isNaN(ticketPriceEth)
          ? `${ticketPriceEth.toFixed(4)} ETH`
          : `—`;
        const prizeEthStr = typeof prizePoolEth === 'number' && !isNaN(prizePoolEth)
          ? `${prizePoolEth.toFixed(4)} ETH`
          : `—`;
        const ticketUsdStr = ethUsdPrice && typeof ticketPriceEth === 'number'
          ? ` (~$${(ticketPriceEth * ethUsdPrice).toFixed(2)})`
          : '';
        const prizeUsdStr = ethUsdPrice && typeof prizePoolEth === 'number'
          ? ` (~$${(prizePoolEth * ethUsdPrice).toFixed(2)})`
          : '';
        matchSummary = `${selectedMatch.homeTeam} v ${selectedMatch.awayTeam} ScoreSquare 🎟️ 25 squares, 2 winners\nTicket: ${ticketEthStr}${ticketUsdStr} \nPrize: ${prizeEthStr}${prizeUsdStr}`;
      } else if (commentary) {
        // Prepend commentary for regular matches with proper formatting
        const commentatorDisplay = currentCommentator?.displayName || 'Hattrick Homer';
        matchSummary = `🎤 ${commentary} — ${commentatorDisplay} ai\n\n${competitorsLong} ${keyMomentsText}\n\n@gabedev.eth @kmacb.eth are you in on this one?`;
      }

      //let imageUrl = '';

      let shareUrl = miniAppUrl;
      if (compositeImage) {
        try {
          const dataUrl = await generateCompositeImage(homeLogo, awayLogo, homeScore, awayScore, clock);
          const blob = await (await fetch(dataUrl)).blob();
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: blob });
          const uploadResult = await uploadRes.json();
          if (!uploadRes.ok) throw new Error('Image upload failed');

          // Log the uploaded IPFS CID for debugging/analytics
          if (uploadResult?.ipfsHash) {
            // eslint-disable-next-line no-console
            console.log('Composite image uploaded. CID:', uploadResult.ipfsHash);
          }

          //const gateway = (process.env.NEXT_PUBLIC_PINATAGATEWAY || 'https://gateway.pinata.cloud/ipfs').replace(/\/$/, '');
          //imageUrl = `${gateway}/${uploadResult.ipfsHash}`;

          const urlObj = new URL(miniAppUrl);
          urlObj.searchParams.set('ipfsHash', uploadResult.ipfsHash);
          shareUrl = urlObj.toString();
        } catch (error) {
          console.error("Error generating composite image:", error);
        }
      }

      const embeds: [] | [string] | [string, string] = [shareUrl];
   
      try {
        await sdk.actions.ready({});
        await sdk.actions.composeCast({ text: matchSummary, embeds, channelKey: 'football' });
      } catch (e) {
        console.error('composeCast failed:', e);
      }
    }
  }, [selectedMatch, compositeImage, leagueId, moneyGamesParams, ticketPriceEth, prizePoolEth, ethUsdPrice, currentCommentator?.displayName]);

  return (
    <button
      onClick={openWarpcastUrl}
      disabled={isGenerating}
      className="w-full sm:w-38 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-deepPink hover:bg-fontRed"
    >
      {isGenerating ? '🎤 Generating Commentary...' : (buttonText || 'Share')}
    </button>
  );
}

export default WarpcastShareButton;
