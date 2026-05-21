import React, { useCallback, useEffect, useState } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import { BASE_URL } from '~/lib/config';
import { useFootyFarcaster } from '~/lib/farcaster/useFootyFarcaster';
import { normalizeFootyShareUrl } from '~/lib/farcaster/shareUrl';
import { useCommentator } from '~/hooks/useCommentator';
import { findMostSignificantEvent } from '~/utils/matchDataUtils';
import { RichMatchEvent } from '~/types/commentatorTypes';
import { CommentaryPipeline, CommentaryContext } from '~/services/CommentaryPipeline';

const imageLoadCache = new Map<string, Promise<HTMLImageElement>>();
const FARCASTER_CAST_MAX_BYTES = 320;

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

function getUtf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function truncateToUtf8Bytes(value: string, maxBytes: number) {
  if (maxBytes <= 0) {
    return '';
  }

  if (getUtf8ByteLength(value) <= maxBytes) {
    return value;
  }

  let low = 0;
  let high = value.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const slice = value.slice(0, mid);
    if (getUtf8ByteLength(slice) <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return value.slice(0, low).trimEnd();
}

function fitCastText(parts: string[]) {
  const normalized = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  let text = normalized.join('\n\n');
  if (getUtf8ByteLength(text) <= FARCASTER_CAST_MAX_BYTES) {
    return text;
  }

  const lastIndex = normalized.length - 1;
  if (lastIndex < 0) {
    return '';
  }

  const head = normalized.slice(0, lastIndex);
  const tail = normalized[lastIndex];
  const prefix = head.length > 0 ? `${head.join('\n\n')}\n\n` : '';
  const prefixBytes = getUtf8ByteLength(prefix);
  const ellipsis = '…';
  const ellipsisBytes = getUtf8ByteLength(ellipsis);
  const remainingBytes = FARCASTER_CAST_MAX_BYTES - prefixBytes - ellipsisBytes;

  if (remainingBytes <= 0) {
    return truncateToUtf8Bytes(text, FARCASTER_CAST_MAX_BYTES - ellipsisBytes) + ellipsis;
  }

  const truncatedTail = truncateToUtf8Bytes(tail, remainingBytes);
  text = `${prefix}${truncatedTail}${ellipsis}`;

  if (getUtf8ByteLength(text) <= FARCASTER_CAST_MAX_BYTES) {
    return text;
  }

  return truncateToUtf8Bytes(text, FARCASTER_CAST_MAX_BYTES);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, timeoutMs);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
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
  homeTeamId?: string;
  awayTeamId?: string;
  homeScore: number;
  awayScore: number;
  clock: string;
  homeLogo: string;
  awayLogo: string;
  eventStarted: boolean;
  matchDate?: string;
  espnEventId?: string;
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
}

interface MatchThreadParticipant {
  fid: number;
  displayName: string;
  pfpUrl: string | null;
}

interface BanterSuggestion {
  id: string;
  label: string;
  text: string;
  mode: 'same-side' | 'rival-poke' | 'player-specific';
}

export function WarpcastShareButton({ selectedMatch, compositeImage, leagueId, moneyGamesParams, ticketPriceEth, prizePoolEth }: WarpcastShareButtonProps) {
  const { isGenerating, currentCommentator } = useCommentator();
  const {
    runtime,
    hasFootySession,
    hasLinkedFarcaster,
    hasSigner,
    onboardingState,
    beginPrivyLogin,
    beginLinkFarcaster,
    beginSignerAuthorization,
    signCast,
    submitSignedMessage,
    fid,
  } = useFootyFarcaster();
  const [ethUsdPrice, setEthUsdPrice] = useState<number | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [personalCommentary, setPersonalCommentary] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'sent'>('idle');
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isAdvancingOnboarding, setIsAdvancingOnboarding] = useState(false);
  const [matchThreadState, setMatchThreadState] = useState<'unknown' | 'first' | 'existing'>('unknown');
  const [matchThreadParticipants, setMatchThreadParticipants] = useState<MatchThreadParticipant[]>([]);
  const [matchThreadReplyCount, setMatchThreadReplyCount] = useState(0);
  const [banterSuggestions, setBanterSuggestions] = useState<BanterSuggestion[]>([]);
  const [isLoadingBanterSuggestions, setIsLoadingBanterSuggestions] = useState(false);
  const [isResolvingThreadContext, setIsResolvingThreadContext] = useState(true);

  useEffect(() => {
    if (shareStatus !== 'sent') {
      return;
    }

    const timer = window.setTimeout(() => {
      setShareStatus('idle');
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [shareStatus]);

  useEffect(() => {
    if (!compositeImage) {
      return;
    }

    void loadImage(selectedMatch.homeLogo).catch(() => null);
    void loadImage(selectedMatch.awayLogo).catch(() => null);
    void loadImage('/assets/banny_background.png').catch(() => null);
  }, [compositeImage, selectedMatch.homeLogo, selectedMatch.awayLogo]);

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

  useEffect(() => {
    let cancelled = false;

    const frameUrlRaw = BASE_URL || 'https://fc-footy.vercel.app';
    const frameUrl = frameUrlRaw.startsWith('http') ? frameUrlRaw : `https://${frameUrlRaw}`;
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

    search.set("home", selectedMatch.homeTeam);
    search.set("away", selectedMatch.awayTeam);
    search.set("homeScore", String(selectedMatch.homeScore));
    search.set("awayScore", String(selectedMatch.awayScore));
    search.set("status", selectedMatch.clock);
    search.set("isLive", String(Boolean(selectedMatch.eventStarted)));

    const query = search.toString();
    const canonicalShareUrl = normalizeFootyShareUrl(`${frameUrl}${query ? `?${query}` : ''}`);

    setMatchThreadState('unknown');
    setMatchThreadParticipants([]);
    setMatchThreadReplyCount(0);
    setBanterSuggestions([]);
    setIsLoadingBanterSuggestions(false);
    setIsResolvingThreadContext(true);

    const loadMatchThreadState = async () => {
      try {
        const response = await fetch(
          `/api/farcaster/match-thread?shareUrl=${encodeURIComponent(canonicalShareUrl)}&limit=25`
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              found?: boolean;
              parentCast?: { fid?: number; hash?: string } | null;
              replyParticipants?: MatchThreadParticipant[];
              replyCount?: number;
            }
          | null;

        if (!cancelled) {
          const hasExistingThread = Boolean(response.ok && payload?.found);
          setMatchThreadState(hasExistingThread ? 'existing' : 'first');
          setMatchThreadParticipants(hasExistingThread && Array.isArray(payload?.replyParticipants) ? payload.replyParticipants : []);
          setMatchThreadReplyCount(hasExistingThread && typeof payload?.replyCount === 'number' ? payload.replyCount : 0);

          setIsLoadingBanterSuggestions(true);

          try {
            const suggestionsRes = await fetch('/api/farcaster/banter-suggestions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                shareUrl: canonicalShareUrl,
                viewerFid: fid,
                selectedMatch: {
                  homeTeam: selectedMatch.homeTeam,
                  awayTeam: selectedMatch.awayTeam,
                  competition: selectedMatch.competition,
                  espnEventId: selectedMatch.espnEventId,
                  matchDate: selectedMatch.matchDate,
                  keyMoments: selectedMatch.keyMoments || [],
                  matchEvents: selectedMatch.matchEvents || [],
                },
              }),
            });

            const suggestionsPayload = (await suggestionsRes.json().catch(() => null)) as
              | { suggestions?: BanterSuggestion[] }
              | null;

            if (!cancelled) {
              setBanterSuggestions(Array.isArray(suggestionsPayload?.suggestions) ? suggestionsPayload.suggestions : []);
            }
          } catch {
            if (!cancelled) {
              setBanterSuggestions([]);
            }
          } finally {
            if (!cancelled) {
              setIsLoadingBanterSuggestions(false);
              setIsResolvingThreadContext(false);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setMatchThreadState('unknown');
          setMatchThreadParticipants([]);
          setMatchThreadReplyCount(0);
          setBanterSuggestions([]);
          setIsLoadingBanterSuggestions(false);
          setIsResolvingThreadContext(false);
        }
      }
    };

    void loadMatchThreadState();

    return () => {
      cancelled = true;
    };
  }, [
    leagueId,
    moneyGamesParams,
    selectedMatch.awayScore,
    selectedMatch.awayTeam,
    selectedMatch.clock,
    selectedMatch.eventStarted,
    selectedMatch.espnEventId,
    selectedMatch.homeScore,
    selectedMatch.homeTeamId,
    selectedMatch.homeTeam,
    selectedMatch.keyMoments,
    selectedMatch.matchDate,
    selectedMatch.matchEvents,
    selectedMatch.competition,
    fid,
  ]);

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

  const shareButtonLabel =
    isGenerating ? '🎤 Generating Commentary...' :
    isAdvancingOnboarding ? 'Opening Footy sign in...' :
    isCreatingRoom ? getLoadingMessage() :
    shareStatus === 'sent' ? 'Shared to Farcaster' :
    !hasFootySession && runtime === 'miniapp' ? 'Authorize Footy to cast' :
    !hasFootySession ? 'Sign in to share' :
    !hasLinkedFarcaster ? 'Continue with Farcaster' :
    !hasSigner ? 'Authorize Footy to cast' :
    onboardingState === 'needs_email' ? 'Add email to share' :
    onboardingState === 'needs_wallet' ? 'Create wallet to share' :
    'Share Score';

  const subtleShareHint =
    matchThreadState === 'first'
      ? 'Start the banter'
      : matchThreadState === 'existing'
        ? 'Add to the banter'
        : null;

  const visibleParticipants = matchThreadState === 'existing' ? matchThreadParticipants.slice(0, 3) : [];
  const additionalParticipants = Math.max(matchThreadReplyCount - visibleParticipants.length, 0);

  const commentaryPlaceholder =
    matchThreadState === 'first'
      ? 'Start the banter'
      : 'Add your commentary';

  const onboardingMessage = (() => {
    if (!hasFootySession) {
      return runtime === 'miniapp'
        ? 'Sign in to Footy with Privy so your Farcaster signer can cast from the mini app.'
        : 'Sign in to Footy App before sharing this match on Farcaster.';
    }

    if (!hasLinkedFarcaster) {
      return 'Connect your Farcaster account to Footy before sharing this match.';
    }

    if (!hasSigner) {
      return 'Authorize Footy to use your Farcaster signer before sharing this match.';
    }

    switch (onboardingState) {
      case 'needs_email':
        return 'Add your email to your Footy account before sharing this match.';
      case 'needs_wallet':
        return 'Create your wallet before sharing this match to Farcaster.';
      default:
        return null;
    }
  })();

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
    setShareMessage(null);

    if (onboardingState !== 'ready') {
      if (runtime === 'miniapp' && onboardingState === 'needs_auth') {
        setShareMessage('Sign in to Footy to enable casting.');
        setIsAdvancingOnboarding(true);
        try {
          await beginPrivyLogin();
        } catch (error) {
          setShareMessage(error instanceof Error ? error.message : 'Unable to open Footy sign in.');
        } finally {
          setIsAdvancingOnboarding(false);
        }
        return;
      }

      if (!hasLinkedFarcaster || !hasSigner) {
        setShareMessage(onboardingMessage);
        setIsAdvancingOnboarding(true);
        try {
          if (!hasLinkedFarcaster) {
            await beginLinkFarcaster();
          } else {
            await beginSignerAuthorization();
          }
        } catch (error) {
          setShareMessage(error instanceof Error ? error.message : 'Unable to continue Footy sign in.');
        } finally {
          setIsAdvancingOnboarding(false);
        }
        return;
      }
    }

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
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        clock,
        homeLogo,
        awayLogo,
        eventStarted,
        keyMoments,
        matchEvents,
        competition,
      } = selectedMatch;

      const keyMomentsText = keyMoments && keyMoments.length > 0
        ? `\n\nKey Moments:\n${keyMoments.join('\n')}`
        : "";
      const personalCommentaryText = personalCommentary.trim()
        ? `\n\n${personalCommentary.trim()}`
        : '';

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

      // Add match details for the OG image
      search.set("home", homeTeam);
      search.set("away", awayTeam);
      search.set("homeScore", homeScore.toString());
      search.set("awayScore", awayScore.toString());
      search.set("status", clock);
      search.set("isLive", eventStarted.toString());

      const currentQuery = search.toString() ? `?${search.toString()}` : "";

      // Build the base mini app URL from frameUrl and current query string.
      const miniAppUrl = `${frameUrl}${currentQuery}`;

      const commentaryPromise =
        matchEvents && matchEvents.length > 0 && !moneyGamesParams
          ? withTimeout(
              generateCommentaryForMatch(
                selectedMatch.homeTeam,
                selectedMatch.awayTeam,
                competition || 'Football Match',
                matchEvents,
                homeScore,
                awayScore
              ),
              1500,
              ''
            )
          : Promise.resolve('');

      const shareTargetPromise =
        compositeImage
          ? (async () => {
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
                console.log('Composite image uploaded. Key:', uploadResult.objectKey);
              }

              return {
                shareUrl: miniAppUrl,
                imageUrl: uploadResult.publicUrl,
              };
            })().catch((error) => {
              console.error("Error generating composite image:", error);
              return {
                shareUrl: miniAppUrl,
                imageUrl: null,
              };
            })
          : Promise.resolve({
              shareUrl: miniAppUrl,
              imageUrl: null,
            });

      const [commentary, shareTarget] = await Promise.all([commentaryPromise, shareTargetPromise]);
      const canonicalShareUrl = normalizeFootyShareUrl(shareTarget.shareUrl);

      let parentCast: { fid: number; hash: `0x${string}` } | undefined;
      try {
        const parentLookupRes = await fetch(
          `/api/farcaster/match-thread?shareUrl=${encodeURIComponent(canonicalShareUrl)}&limit=25`
        );
        const parentLookup = (await parentLookupRes.json().catch(() => null)) as
          | { found?: boolean; parentCast?: { fid?: number; hash?: string } | null; error?: string }
          | null;

        if (parentLookupRes.ok && parentLookup?.found && parentLookup.parentCast?.fid && parentLookup.parentCast.hash) {
          parentCast = {
            fid: parentLookup.parentCast.fid,
            hash: parentLookup.parentCast.hash as `0x${string}`,
          };
        }
      } catch (error) {
        console.warn('Unable to lookup recent match thread before sharing.', error);
      }

      // Build the cast text
      const isMoneyGame = Boolean(moneyGamesParams);
      const isReply = Boolean(parentCast);
      let matchSummary = fitCastText([
        `${competitorsLong}${personalCommentaryText}${keyMomentsText}`,
        ...(isReply ? [] : ['@gabedev.eth @kmacb.eth are you in on this one?']),
      ]);
      
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
        matchSummary = fitCastText([
          `${selectedMatch.homeTeam} v ${selectedMatch.awayTeam} ScoreSquare 🎟️ 25 squares, 2 winners\nTicket: ${ticketEthStr}${ticketUsdStr} \nPrize: ${prizeEthStr}${prizeUsdStr}`,
        ]);
      } else if (commentary) {
        // Prepend commentary for regular matches with proper formatting
        const commentatorDisplay = currentCommentator?.displayName || 'Hattrick Homer';
        matchSummary = fitCastText([
          `${competitorsLong}${personalCommentaryText}${keyMomentsText}`,
          `🎤 ${commentary} — ${commentatorDisplay} ai`,
          ...(isReply ? [] : ['@gabedev.eth @kmacb.eth are you in on this one?']),
        ]);
      }

      const embeds: [] | [string] | [string, string] = isReply
        ? []
        : shareTarget.imageUrl
          ? [shareTarget.imageUrl, shareTarget.shareUrl]
          : [shareTarget.shareUrl];

      const signedMessage = await signCast({
        text: matchSummary,
        embeds,
        parentCast,
      });

      await submitSignedMessage(signedMessage);
      setPersonalCommentary('');
      setShareStatus('sent');
      setShareMessage('Cast sent from Footy.');
      }
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : 'Unable to share this match right now.');
    } finally {
      // Reset creating room state
      setIsCreatingRoom(false);
    }
  }, [
    beginLinkFarcaster,
    beginPrivyLogin,
    beginSignerAuthorization,
    compositeImage,
    currentCommentator?.displayName,
    ethUsdPrice,
    hasLinkedFarcaster,
    hasSigner,
    leagueId,
    moneyGamesParams,
    onboardingMessage,
    onboardingState,
    personalCommentary,
    prizePoolEth,
    runtime,
    selectedMatch,
    signCast,
    submitSignedMessage,
    ticketPriceEth,
  ]);

  return (
    <div className="w-full space-y-3">
      <div className="min-h-[54px] space-y-2">
        {isResolvingThreadContext ? (
          <>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 animate-pulse rounded-full bg-lightPurple/10" />
              <div className="h-7 w-7 animate-pulse rounded-full bg-lightPurple/10" />
              <div className="h-7 w-7 animate-pulse rounded-full bg-lightPurple/10" />
            </div>
            <div className="h-3 w-32 animate-pulse rounded bg-lightPurple/10" />
          </>
        ) : (
          <>
            {matchThreadState === 'existing' && visibleParticipants.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {visibleParticipants.map((participant, index) => (
                    <div
                      key={participant.fid}
                      className={`relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-darkPurple bg-[#251b34] text-[10px] font-semibold text-notWhite ${index > 0 ? '-ml-2' : ''}`}
                      title={participant.displayName}
                    >
                      {participant.pfpUrl ? (
                        <img
                          src={participant.pfpUrl}
                          alt={participant.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(participant.displayName)}</span>
                      )}
                    </div>
                  ))}
                </div>
                {additionalParticipants > 0 ? (
                  <span className="text-[11px] uppercase tracking-[0.14em] text-lightPurple/55">
                    +{additionalParticipants} others
                  </span>
                ) : null}
              </div>
            ) : null}
            {subtleShareHint ? (
              <p className="text-xs uppercase tracking-[0.18em] text-lightPurple/70">{subtleShareHint}</p>
            ) : null}
          </>
        )}
      </div>
      <textarea
        value={personalCommentary}
        onChange={(event) => setPersonalCommentary(event.target.value)}
        placeholder={commentaryPlaceholder}
        maxLength={220}
        rows={3}
        className="w-full rounded-lg border border-limeGreenOpacity/30 bg-darkPurple px-3 py-2 text-[16px] text-notWhite placeholder:text-lightPurple/60 focus:border-deepPink focus:outline-none"
      />
      {(matchThreadState === 'existing' || matchThreadState === 'first' || isLoadingBanterSuggestions || banterSuggestions.length > 0) ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.14em] text-lightPurple/55">Suggested banter</span>
            {isLoadingBanterSuggestions ? (
              <span className="text-[10px] uppercase tracking-[0.12em] text-lightPurple/40">Loading</span>
            ) : null}
          </div>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 px-1">
              {isLoadingBanterSuggestions
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[88px] w-[220px] animate-pulse rounded-xl border border-lightPurple/10 bg-lightPurple/5"
                    />
                  ))
                : banterSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => setPersonalCommentary(suggestion.text)}
                      className="w-[240px] flex-none rounded-xl border border-lightPurple/20 bg-darkPurple px-3 py-2 text-left transition hover:border-deepPink"
                    >
                      <div className="text-[10px] uppercase tracking-[0.14em] text-lightPurple/55">{suggestion.label}</div>
                      <div className="mt-1 text-[13px] leading-5 text-notWhite">{suggestion.text}</div>
                    </button>
                  ))}
            </div>
          </div>
        </div>
      ) : null}
      <button
        onClick={openWarpcastUrl}
        disabled={isGenerating || isCreatingRoom || isAdvancingOnboarding || shareStatus === 'sent'}
        className="w-full sm:w-38 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-deepPink hover:bg-fontRed"
      >
        {shareButtonLabel}
      </button>
      {shareMessage ? (
        <p className="text-sm text-lightPurple">{shareMessage}</p>
      ) : null}
    </div>
  );
}

export default WarpcastShareButton;
