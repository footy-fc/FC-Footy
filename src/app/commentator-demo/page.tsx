'use client';

import React, { useState } from 'react';
import { CommentatorSelector } from '~/components/CommentatorSelector';
import { useCommentator } from '~/hooks/useCommentator';
import { MatchEvent } from '~/types/commentatorTypes';

// Demo scenarios for testing commentary
const DEMO_SCENARIOS: Array<MatchEvent & { id: string; name: string }> = [
  {
    id: 'messi-wc-final',
    name: 'Messi World Cup Final Goal',
    eventId: 'wc22-arg-fra-final',
    homeTeam: 'Argentina',
    awayTeam: 'France',
    competition: 'FIFA World Cup 2022',
    eventType: 'goal',
    player: 'Lionel Messi',
    minute: 23,
    score: '1-0',
    context: 'Messi opens the scoring in the World Cup final'
  },
  {
    id: 'roma-comeback',
    name: 'Roma Comeback vs Barcelona',
    eventId: 'ucl18-roma-barca-qf',
    homeTeam: 'AS Roma',
    awayTeam: 'FC Barcelona',
    competition: 'UEFA Champions League',
    eventType: 'goal',
    player: 'Kostas Manolas',
    minute: 82,
    score: '3-0',
    context: 'Roma complete historic comeback to advance on away goals'
  },
  {
    id: 'morocco-upset',
    name: 'Morocco Upsets Portugal',
    eventId: 'wc22-mor-por-qf',
    homeTeam: 'Morocco',
    awayTeam: 'Portugal',
    competition: 'FIFA World Cup 2022',
    eventType: 'goal',
    player: 'Youssef En-Nesyri',
    minute: 42,
    score: '1-0',
    context: 'Morocco becomes first African team to reach World Cup semifinals'
  },
  {
    id: 'cameroon-brazil',
    name: 'Cameroon Stuns Brazil',
    eventId: 'wc22-cam-bra-group',
    homeTeam: 'Cameroon',
    awayTeam: 'Brazil',
    competition: 'FIFA World Cup 2022',
    eventType: 'goal',
    player: 'Vincent Aboubakar',
    minute: 92,
    score: '1-0',
    context: 'Stoppage-time winner against Brazil in group stage'
  },
  {
    id: 'senegal-ecuador',
    name: 'Senegal Advances',
    eventId: 'wc22-sen-ecu-group',
    homeTeam: 'Senegal',
    awayTeam: 'Ecuador',
    competition: 'FIFA World Cup 2022',
    eventType: 'goal',
    player: 'Kalidou Koulibaly',
    minute: 70,
    score: '2-1',
    context: 'Captain scores match-winning volley to send Senegal through'
  },
  {
    id: 'south-africa-mexico',
    name: 'South Africa World Cup Opener',
    eventId: 'wc10-rsa-mex-opener',
    homeTeam: 'South Africa',
    awayTeam: 'Mexico',
    competition: 'FIFA World Cup 2010',
    eventType: 'goal',
    player: 'Siphiwe Tshabalala',
    minute: 55,
    score: '1-0',
    context: 'Tournament opening goal with iconic celebration'
  }
];

export default function CommentatorDemoPage() {
  const [selectedScenario, setSelectedScenario] = useState(DEMO_SCENARIOS[0]);
  const [generatedCommentary, setGeneratedCommentary] = useState<string>('');
  const { generateCommentary, isGenerating, currentCommentator, commentators, selectedCommentator, switchCommentator } = useCommentator();

  const handleGenerateCommentary = async () => {
    try {
      const commentary = await generateCommentary(selectedScenario);
      setGeneratedCommentary(commentary);
    } catch (error) {
      console.error('Failed to generate commentary:', error);
      setGeneratedCommentary('Failed to generate commentary. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-darkPurple text-notWhite">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-notWhite mb-4">
            🎤 AI Commentary Demo
          </h1>
          <p className="text-lightPurple text-lg max-w-2xl mx-auto">
            Experience legendary football commentary powered by AI, 
            featuring the styles of Peter Drury and Ray Hudson.
          </p>
        </div>

        {/* Commentator Selector */}
        <div className="mb-8">
          <CommentatorSelector 
            commentators={commentators}
            selectedCommentator={selectedCommentator}
            onCommentatorChange={switchCommentator}
          />
        </div>

        {/* Scenario Selector */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-notWhite mb-4">📺 Select Match Scenario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`p-4 rounded-lg border transition-all ${
                  selectedScenario.id === scenario.id
                    ? 'border-limeGreenOpacity bg-limeGreenOpacity/10'
                    : 'border-limeGreenOpacity/20 bg-purplePanel hover:border-limeGreenOpacity/40'
                }`}
              >
                <h3 className="font-semibold text-notWhite mb-2">{scenario.name}</h3>
                <div className="text-sm text-lightPurple space-y-1">
                  <div>🏟️ {scenario.homeTeam} vs {scenario.awayTeam}</div>
                  <div>🏆 {scenario.competition}</div>
                  <div>⚽ {scenario.eventType.toUpperCase()}</div>
                  {scenario.player && <div>👤 {scenario.player}</div>}
                  {scenario.minute && <div>⏰ {scenario.minute}&apos;</div>}
                  {scenario.score && <div>📊 {scenario.score}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Commentary Button */}
        <div className="mb-8 text-center">
          <button
            onClick={handleGenerateCommentary}
            disabled={isGenerating}
            className="bg-limeGreenOpacity text-darkPurple px-8 py-3 rounded-lg font-semibold text-lg hover:bg-limeGreenOpacity/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 2.577 1.03 4.91 2.709 6.709l1.291-1.418z"></path>
                </svg>
                Generating Commentary...
              </div>
            ) : (
              `Generate ${currentCommentator?.name || 'Commentary'}`
            )}
          </button>
        </div>

        {/* Generated Commentary History */}
        {generatedCommentary && (
          <div className="bg-purplePanel rounded-lg p-6 border border-limeGreenOpacity/20">
            <h2 className="text-2xl font-bold text-notWhite mb-4">
              🎭 Generated Commentary
              {currentCommentator && (
                <span className="text-sm text-lightPurple ml-2">
                  by {currentCommentator.name}
                </span>
              )}
            </h2>
            <div className="bg-darkPurple rounded p-4 border border-limeGreenOpacity/10">
              <p className="text-lightPurple italic text-xl leading-relaxed">
                &quot;{generatedCommentary}&quot;
              </p>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              <p>💡 This commentary was generated using AI trained on {currentCommentator?.name}&apos;s iconic moments and signature style.</p>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-purplePanel rounded-lg p-6 border border-limeGreenOpacity/20">
            <h3 className="text-xl font-bold text-notWhite mb-3">🎯 RAG-Powered</h3>
            <p className="text-lightPurple">
              Uses Retrieval-Augmented Generation to find the most relevant quotes 
              for each match scenario.
            </p>
          </div>
          
          <div className="bg-purplePanel rounded-lg p-6 border border-limeGreenOpacity/20">
            <h3 className="text-xl font-bold text-notWhite mb-3">🎭 Authentic Styles</h3>
            <p className="text-lightPurple">
              Trained on authentic commentary styles with signature language, 
              metaphors, and dramatic delivery.
            </p>
          </div>
          
          <div className="bg-purplePanel rounded-lg p-6 border border-limeGreenOpacity/20">
            <h3 className="text-xl font-bold text-notWhite mb-3">📱 Farcaster Ready</h3>
            <p className="text-lightPurple">
              Directly compose casts with generated commentary, 
              perfect for live match updates and reactions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-lightPurple">
          <p>Experience the future of football commentary with AI-powered authenticity.</p>
        </div>
      </div>
    </div>
  );
}
