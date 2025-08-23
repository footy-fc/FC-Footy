'use client';

import React, { useState } from 'react';
import PeterDruryComposeCast from '~/components/PeterDruryComposeCast';
import { MatchEvent } from '~/components/ai/PeterDruryRAG';

// Demo scenarios for testing Peter Drury commentary
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

export default function PeterDruryDemoPage() {
  const [selectedScenario, setSelectedScenario] = useState(DEMO_SCENARIOS[0]);
  const [generatedCommentary, setGeneratedCommentary] = useState<string>('');

  const handleCommentaryGenerated = (commentary: string) => {
    setGeneratedCommentary(commentary);
  };

  return (
    <div className="min-h-screen bg-darkPurple text-notWhite">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-notWhite mb-4">
            🎤 Peter Drury Commentary AI
          </h1>
          <p className="text-lightPurple text-lg max-w-2xl mx-auto">
            Experience the magic of Peter Drury&apos;s legendary commentary style, 
            powered by AI and trained on his most iconic moments.
          </p>
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

        {/* Peter Drury Commentary Component */}
        <div className="mb-8">
          <PeterDruryComposeCast
            eventId={selectedScenario.eventId}
            homeTeam={selectedScenario.homeTeam}
            awayTeam={selectedScenario.awayTeam}
            competition={selectedScenario.competition}
            eventType={selectedScenario.eventType}
            player={selectedScenario.player}
            minute={selectedScenario.minute}
            score={selectedScenario.score}
            context={selectedScenario.context}
            onCommentaryGenerated={handleCommentaryGenerated}
          />
        </div>

        {/* Generated Commentary History */}
        {generatedCommentary && (
          <div className="bg-purplePanel rounded-lg p-6 border border-limeGreenOpacity/20">
            <h2 className="text-2xl font-bold text-notWhite mb-4">🎭 Latest Commentary</h2>
            <div className="bg-darkPurple rounded p-4 border border-limeGreenOpacity/10">
              <p className="text-lightPurple italic text-xl leading-relaxed">
                &quot;{generatedCommentary}&quot;
              </p>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              <p>💡 This commentary was generated using AI trained on Peter Drury&apos;s iconic moments, 
              including his legendary calls from Roma vs Barcelona, World Cup finals, and more.</p>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-purplePanel rounded-lg p-6 border border-limeGreenOpacity/20">
            <h3 className="text-xl font-bold text-notWhite mb-3">🎯 RAG-Powered</h3>
            <p className="text-lightPurple">
              Uses Retrieval-Augmented Generation to find the most relevant Peter Drury quotes 
              for each match scenario.
            </p>
          </div>
          
          <div className="bg-purplePanel rounded-lg p-6 border border-limeGreenOpacity/20">
            <h3 className="text-xl font-bold text-notWhite mb-3">🎭 Authentic Style</h3>
            <p className="text-lightPurple">
              Trained on Drury&apos;s signature poetic language, mythology references, 
              and dramatic crescendos.
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
          <p className="text-sm">
            🎤 Peter Drury Commentary AI - Bringing the magic of football&apos;s greatest commentator to your fingertips
          </p>
        </div>
      </div>
    </div>
  );
}
