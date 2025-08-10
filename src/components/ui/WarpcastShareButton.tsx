import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from "next/navigation";
import frameSdk, { sdk } from "@farcaster/frame-sdk";
import { BASE_URL } from '~/lib/config';

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
}

interface WarpcastShareButtonProps {
  selectedMatch: SelectedMatch;
  targetElement?: HTMLElement | null;
  buttonText?: string;
  compositeImage?: boolean;
  fallbackLeague?: string;
  leagueId?: string;
}

export function WarpcastShareButton({ selectedMatch, buttonText, compositeImage, fallbackLeague, leagueId }: WarpcastShareButtonProps) {
  const [context, setContext] = useState<unknown>(undefined);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadContext = async () => {
      try {
        setContext(await frameSdk.context);
        setIsContextLoaded(true);
      } catch (error) {
        console.error("Failed to load Farcaster context:", error);
      }
    };

    if (!isContextLoaded) {
      loadContext();
    }
  }, [isContextLoaded]);

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
      } = selectedMatch;

      const keyMomentsText = keyMoments && keyMoments.length > 0
        ? `\n\nKey Moments:\n${keyMoments.join('\n')}`
        : "";

      const search = new URLSearchParams();

      search.set("tab", "matches");
      if (leagueId) {
        search.set("league", leagueId);
      }

      const currentQuery = search.toString() ? `?${search.toString()}` : "";

      // Build the base mini app URL from frameUrl and current query string.
      let miniAppUrl = `${frameUrl}${currentQuery}`;

      // Build the match summary and encode it
      const matchSummary = `${competitorsLong} ${keyMomentsText}\n\n@gabedev.eth @kmacb.eth are you watching this one?`;

      //let imageUrl = '';

      let shareUrl = miniAppUrl;
      if (compositeImage) {
        try {
          const dataUrl = await generateCompositeImage(homeLogo, awayLogo, homeScore, awayScore, clock);
          const blob = await (await fetch(dataUrl)).blob();
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: blob });
          const uploadResult = await uploadRes.json();
          if (!uploadRes.ok) throw new Error('Image upload failed');

          //const gateway = (process.env.NEXT_PUBLIC_PINATAGATEWAY || 'https://gateway.pinata.cloud/ipfs').replace(/\/$/, '');
          //imageUrl = `${gateway}/${uploadResult.ipfsHash}`;

          const urlObj = new URL(miniAppUrl);
          urlObj.searchParams.set('ipfsHash', uploadResult.ipfsHash);
          shareUrl = urlObj.toString();
        } catch (error) {
          console.error("Error generating composite image:", error);
        }
      }

      let embeds: [] | [string] | [string, string] = [shareUrl];
   
      try {
        await sdk.actions.ready({});
        await sdk.actions.composeCast({ text: matchSummary, embeds, channelKey: 'footbal' });
      } catch (e) {
        console.error('composeCast failed:', e);
      }
    }
  }, [selectedMatch, context, searchParams, compositeImage, fallbackLeague, leagueId]);

  return (
    <button
      onClick={openWarpcastUrl}
      className="w-full sm:w-38 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-deepPink hover:bg-fontRed"
    >
      {buttonText || 'Share'}
    </button>
  );
}

export default WarpcastShareButton;
