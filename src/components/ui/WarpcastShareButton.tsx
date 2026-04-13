import React, { useCallback, useEffect, useState } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import { BASE_URL } from '~/lib/config';
import { useCommentator } from '~/hooks/useCommentator';
import { findMostSignificantEvent } from '~/utils/matchDataUtils';
import { RichMatchEvent } from '~/types/commentatorTypes';
import { CommentaryPipeline, CommentaryContext } from '~/services/CommentaryPipeline';

const imageLoadCache = new Map<string, Promise<HTMLImageElement>>();

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageLoadCache.get(src);
  if (cached) {
    return cached;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      imageLoadCache.delete(src);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });

  imageLoadCache.set(src, promise);
  return promise;
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png') {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas export failed.'));
        return;
      }

      resolve(blob);
    }, type);
  });
}

function drawLogoPanel(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  fallbackText: string,
  x: number,
  y: number,
  size: number,
  panelColor: string,
  textColor: string
) {
  if (image) {
    ctx.drawImage(image, x, y, size, size);
    return;
  }

  ctx.fillStyle = "#1a1520";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = panelColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
  ctx.fillStyle = textColor;
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fallbackText, x + size / 2, y + size / 2);
}

async function generateCompositeImageBlob(
  homeLogo: string,
  awayLogo: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  clock: string
): Promise<Blob> {
  const purplePanel = "#010513"; 
  const textNotWhite = "#FEA282"; 
  
  const canvas = document.createElement('canvas');
  canvas.width = 480;  
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = purplePanel;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const [homeResult, awayResult, spinnerResult] = await Promise.allSettled([
    loadImage(homeLogo),
    loadImage(awayLogo),
    loadImage('/assets/banny_background.png'),
  ]);

  const homeImg = homeResult.status === "fulfilled" ? homeResult.value : null;
  const awayImg = awayResult.status === "fulfilled" ? awayResult.value : null;
  const spinnerImg = spinnerResult.status === "fulfilled" ? spinnerResult.value : null;

  const logoSize = 160; 
  const logoY = (canvas.height - logoSize) / 2; 

  drawLogoPanel(ctx, homeImg, getInitials(homeTeam), 0, logoY, logoSize, textNotWhite, textNotWhite);
  drawLogoPanel(
    ctx,
    awayImg,
    getInitials(awayTeam),
    canvas.width - logoSize,
    logoY,
    logoSize,
    textNotWhite,
    textNotWhite
  );

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

  if (spinnerImg) {
    const spinnerSize = 120;
    const spinnerX = (canvas.width - spinnerSize) / 2;
    const spinnerY = (canvas.height - spinnerSize) / 1.5;
    ctx.globalAlpha = 0.2;
    ctx.drawImage(spinnerImg, spinnerX, spinnerY, spinnerSize, spinnerSize);
    ctx.globalAlpha = 1;
  }

  return canvasToBlob(canvas);
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
  compositeImage?: boolean;
  fallbackLeague?: string;
  leagueId?: string;
  moneyGamesParams?: {
    eventId: string;
    gameId?: string;
  };
  ticketPriceEth?: number;
  prizePoolEth?: number;
  onRoomCreated?: (castHash?: string) => void; // Callback when room is successfully created, with optional castHash
  chatRoomExists?: boolean | null; // Pass chat room status from parent
  checkingChatRoom?: boolean; // Pass checking status from parent
  isPremierLeague?: boolean; // Whether this is a Premier League match (eng.1)
}

export function WarpcastShareButton({ selectedMatch, compositeImage, leagueId, moneyGamesParams, ticketPriceEth, prizePoolEth, onRoomCreated, chatRoomExists, checkingChatRoom, isPremierLeague }: WarpcastShareButtonProps) {
  const { isGenerating, currentCommentator } = useCommentator();
  const [ethUsdPrice, setEthUsdPrice] = useState<number | null>(null);
  // Use props from parent instead of local state
  const [localChatRoomExists, setLocalChatRoomExists] = useState<boolean | null>(chatRoomExists ?? null);
  const [localCheckingChatRoom, setLocalCheckingChatRoom] = useState<boolean>(checkingChatRoom ?? false);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [messageIndex, setMessageIndex] = useState<number>(0);

  // Update local state when props change
  useEffect(() => {
    setLocalChatRoomExists(chatRoomExists ?? null);
  }, [chatRoomExists]);

  useEffect(() => {
    setLocalCheckingChatRoom(checkingChatRoom ?? false);
  }, [checkingChatRoom]);

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

  // Cycle through 3 loading messages and stop
  useEffect(() => {
    if (!isCreatingRoom) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex(prev => {
        if (prev >= 2) {
          // Stop at the 3rd message (index 2)
          clearInterval(interval);
          return 2;
        }
        return prev + 1;
      });
    }, 1500); // Change message every 1.5 seconds

    return () => clearInterval(interval);
  }, [isCreatingRoom]);

  // Fun soccer loading messages
  const getLoadingMessage = () => {
    const messages = [
      "⚽ Creating cast embed...",
      "🥅 Setting up the pitch...", 
      "🏃‍♂️ Running down the wing..."
    ];
    return messages[messageIndex];
  };

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
    // Set creating room state for loading message
    setIsCreatingRoom(true);
    
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

    try {
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
          const blob = await generateCompositeImageBlob(
            homeLogo,
            awayLogo,
            selectedMatch.homeTeam,
            selectedMatch.awayTeam,
            homeScore,
            awayScore,
            clock
          );
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: blob });
          const uploadResult: { objectKey: string; publicUrl: string } = await uploadRes.json();
          if (!uploadRes.ok) throw new Error('Image upload failed');

          if (uploadResult?.objectKey) {
            // eslint-disable-next-line no-console
            console.log('Composite image uploaded. Key:', uploadResult.objectKey);
          }

          const urlObj = new URL(miniAppUrl);
          urlObj.searchParams.set('imageKey', uploadResult.objectKey);
          shareUrl = urlObj.toString();
        } catch (error) {
          console.error("Error generating composite image:", error);
        }
      }

      const embeds: [] | [string] | [string, string] = [shareUrl];
   
      try {
        await sdk.actions.ready({});
        const result = await sdk.actions.composeCast({ text: matchSummary, embeds, channelKey: 'football' });
        
        // Save cast hash to KV if cast was successful
        if (result?.cast?.hash && selectedMatch?.eventId) {
          console.log('✅ Cast successful, saving to KV:', result.cast.hash);
          
          try {
            const saveResponse = await fetch('/api/match-rooms', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '',
              },
              body: JSON.stringify({
                eventId: selectedMatch.eventId,
                castHash: result.cast.hash,
                parentUrl: shareUrl,
                fid: null
              })
            });
            
            if (saveResponse.ok) {
              console.log('💾 Cast hash saved to KV for room creation');
              // Update local state to reflect new room
              setLocalChatRoomExists(true);
              onRoomCreated?.(result.cast.hash); // Call the callback with the castHash
            } else {
              console.error('Failed to save cast hash to KV:', await saveResponse.text());
            }
          } catch (saveError) {
            console.error('Error saving cast hash to KV:', saveError);
          }
        } else if (result?.cast === null) {
          console.log('User cancelled the cast');
        }
      } catch (e) {
        console.error('composeCast failed:', e);
      }
      }
    } finally {
      // Reset creating room state
      setIsCreatingRoom(false);
    }
  }, [selectedMatch, compositeImage, leagueId, moneyGamesParams, ticketPriceEth, prizePoolEth, ethUsdPrice, currentCommentator?.displayName, onRoomCreated]);

  return (
    <button
      onClick={openWarpcastUrl}
      disabled={isGenerating || isCreatingRoom}
      className="w-full sm:w-38 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-deepPink hover:bg-fontRed"
    >
      {isGenerating ? '🎤 Generating Commentary...' : 
       isCreatingRoom ? getLoadingMessage() :
       localCheckingChatRoom ? 'Checking...' :
       isPremierLeague ? (
         localChatRoomExists ? 'Share Match' : 'Create Room'
       ) : 'Share'}
    </button>
  );
}

export default WarpcastShareButton;
