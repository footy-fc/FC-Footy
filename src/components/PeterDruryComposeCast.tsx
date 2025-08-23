'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createMatchEvent, type MatchEvent } from '~/components/ai/PeterDruryRAG';
import { sdk } from '@farcaster/miniapp-sdk';

interface PeterDruryComposeCastProps {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  eventType: MatchEvent['eventType'];
  player?: string;
  minute?: number;
  score?: string;
  context?: string;
  onCommentaryGenerated?: (commentary: string) => void;
}

const PeterDruryComposeCast: React.FC<PeterDruryComposeCastProps> = ({
  eventId,
  homeTeam,
  awayTeam,
  competition,
  eventType,
  player,
  minute,
  score,
  context,
  onCommentaryGenerated
}) => {
  const [commentary, setCommentary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // Generate Peter Drury commentary
  const generateCommentary = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const matchEvent = createMatchEvent(
        eventId,
        homeTeam,
        awayTeam,
        competition,
        eventType,
        {
          player,
          minute,
          score,
          context
        }
      );

      const response = await fetch('/api/peter-drury-commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchEvent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate commentary');
      }

      const data = await response.json();
      const generatedCommentary = data.commentary;
      
      setCommentary(generatedCommentary);
      onCommentaryGenerated?.(generatedCommentary);
      
      console.log('🎭 Generated Peter Drury commentary:', generatedCommentary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error generating commentary:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [eventId, homeTeam, awayTeam, competition, eventType, player, minute, score, context, onCommentaryGenerated]);

  // Compose cast with Peter Drury commentary
  const composeCast = async () => {
    if (!commentary) {
      setError('No commentary generated yet');
      return;
    }

    setIsComposing(true);
    setError(null);

    try {
      await sdk.haptics.impactOccurred('light');

      // Create the cast message with Peter Drury commentary
      let castMessage = `🎤 ${commentary}\n\n⚽ ${homeTeam} vs ${awayTeam}\n🏆 ${competition}`;
      
      if (player) {
        castMessage += `\n👤 ${player}`;
      }
      if (minute) {
        castMessage += `\n⏰ ${minute}&apos;`;
      }
      if (score) {
        castMessage += `\n📊 ${score}`;
      }

      await sdk.actions.composeCast({
        text: castMessage,
        embeds: [`https://fc-footy.vercel.app/?eventId=${eventId}`],
      });

      console.log('✅ Cast composed with Peter Drury commentary');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compose cast';
      setError(errorMessage);
      console.error('Error composing cast:', err);
    } finally {
      setIsComposing(false);
    }
  };

  // Auto-generate commentary on mount
  useEffect(() => {
    generateCommentary();
  }, [generateCommentary]);

  return (
    <div className="bg-darkPurple rounded-lg p-4 border border-limeGreenOpacity/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-notWhite">
          🎤 Peter Drury Commentary
        </h3>
        <div className="flex items-center gap-2">
          {isGenerating && (
            <div className="flex items-center gap-2 text-limeGreenOpacity">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-limeGreenOpacity"></div>
              <span className="text-sm">Generating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Match Event Info */}
      <div className="mb-4 p-3 bg-purplePanel rounded border border-limeGreenOpacity/10">
        <div className="grid grid-cols-2 gap-2 text-sm text-lightPurple">
          <div>
            <span className="font-semibold">🏟️ Match:</span> {homeTeam} vs {awayTeam}
          </div>
          <div>
            <span className="font-semibold">⚽ Event:</span> {eventType.toUpperCase()}
          </div>
          {player && (
            <div>
              <span className="font-semibold">👤 Player:</span> {player}
            </div>
          )}
          {minute && (
            <div>
              <span className="font-semibold">⏰ Minute:</span> {minute}&apos;
            </div>
          )}
          {score && (
            <div>
              <span className="font-semibold">📊 Score:</span> {score}
            </div>
          )}
          {context && (
            <div className="col-span-2">
              <span className="font-semibold">📝 Context:</span> {context}
            </div>
          )}
        </div>
      </div>

      {/* Generated Commentary */}
      {commentary && (
        <div className="mb-4">
          <h4 className="text-md font-semibold text-notWhite mb-2">🎭 Generated Commentary:</h4>
          <div className="p-3 bg-purplePanel rounded border border-limeGreenOpacity/10">
            <p className="text-lightPurple italic text-lg leading-relaxed">
              &quot;{commentary}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={generateCommentary}
          disabled={isGenerating}
          className="flex-1 px-4 py-2 bg-limeGreenOpacity text-darkPurple font-semibold rounded hover:bg-limeGreenOpacity/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : '🔄 Regenerate'}
        </button>
        
        <button
          onClick={composeCast}
          disabled={!commentary || isComposing}
          className="flex-1 px-4 py-2 bg-deepPink text-white font-semibold rounded hover:bg-deepPink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isComposing ? 'Composing...' : '📝 Compose Cast'}
        </button>
      </div>

      {/* Loading States */}
      {isComposing && (
        <div className="mt-3 text-center">
          <div className="flex items-center justify-center gap-2 text-limeGreenOpacity">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-limeGreenOpacity"></div>
            <span className="text-sm">Composing cast...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeterDruryComposeCast;
