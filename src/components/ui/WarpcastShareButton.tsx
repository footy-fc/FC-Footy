import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from "next/navigation";
import frameSdk from "@farcaster/frame-sdk";
import { BASE_URL } from '~/lib/config';
import { FrameContext } from '@farcaster/frame-node';

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
}

export function WarpcastShareButton({ selectedMatch, buttonText }: WarpcastShareButtonProps) {
  const [context, setContext] = useState<FrameContext | undefined>(undefined);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadContext = async () => {
      try {
        setContext((await frameSdk.context) as FrameContext);
        setIsContextLoaded(true);
      } catch (error) {
        console.error("Failed to load Farcaster context:", error);
      }
    };

    if (!isContextLoaded) {
      loadContext();
    }
  }, [isContextLoaded]);

  const openWarpcastUrl = useCallback(() => {
    if (selectedMatch) {
      const frameUrl = BASE_URL || 'fc-footy.vercel.app';
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
      } = selectedMatch;

      const keyMomentsText = keyMoments && keyMoments.length > 0
        ? `\n\nKey Moments:\n${keyMoments.join('\n')}`
        : "";

      // Use useSearchParams to get the current query string
      const currentQuery = searchParams?.toString() ? `?${searchParams.toString()}` : "";
      console.log(currentQuery);
      // Append the query string to the mini‑app URL
      const miniAppUrl = `https://warpcast.com/~/frames/launch?url=${frameUrl}${currentQuery}`;

      const matchSummary = `${competitorsLong}
${homeTeam} ${eventStarted ? homeScore : ''} - ${eventStarted ? awayScore : ''} ${awayTeam.toUpperCase()}
${eventStarted ? `Clock: ${clock}` : `Kickoff: ${clock}`}${keyMomentsText}

Using the FC Footy mini-app ${miniAppUrl} cc @gabedev.eth @kmacb.eth`;

      const encodedSummary = encodeURIComponent(matchSummary);
      const url = `https://warpcast.com/~/compose?text=${encodedSummary}&channelKey=football&embeds[]=${homeLogo}&embeds[]=${awayLogo}`;
      console.log(context);
      if (context === undefined) {
        window.open(url, '_blank');
      } else {
        frameSdk.actions.openUrl(url);
      }
    }
  }, [selectedMatch, context, searchParams]);

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
