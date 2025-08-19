"use client";

import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

interface FPLManager {
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  event_total: number;
  rank: number;
  fid?: number;
  username?: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  status: "pending" | "loading" | "completed" | "error";
  data?: any;
}

export default function GameWeekSummaryStepByStep() {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, title: "Load FPL Data", description: "Fetch current league standings", status: "pending" },
    { id: 2, title: "Process Manager FIDs", description: "Match managers with Farcaster accounts", status: "pending" },
    { id: 3, title: "Generate Infographic", description: "Create and upload visual summary to IPFS", status: "pending" },
    { id: 4, title: "Review Cast", description: "Preview the generated cast text", status: "pending" },
    { id: 5, title: "Post to Farcaster", description: "Compose and publish the cast", status: "pending" }
  ]);
  
  const [fplData, setFplData] = useState<FPLManager[]>([]);
  const [managersWithFIDs, setManagersWithFIDs] = useState<FPLManager[]>([]);
  const [castText, setCastText] = useState("");
  const [infographicUrl, setInfographicUrl] = useState("");
  const [gameWeek, setGameWeek] = useState(1);
  const [responseMessage, setResponseMessage] = useState("");

  const updateStep = (stepId: number, status: Step["status"], data?: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, data }
        : step
    ));
  };

  // Step 1: Load FPL Data
  const loadFPLData = async () => {
    updateStep(1, "loading");
    try {
      // Check if we're in a miniapp context
      const isMiniapp = typeof window !== 'undefined' && 
        (window.location.href.includes('warpcast.com') || 
         window.location.href.includes('farcaster.xyz') ||
         window.location.href.includes('ngrok.app'));
      
      console.log(`🔍 Context: ${isMiniapp ? 'Miniapp' : 'Web'}`);
      
      // Build base candidates based on context
      const baseCandidates = [];
      
      if (isMiniapp) {
        // In miniapp context, use relative URLs to avoid CORS
        baseCandidates.push(''); // Empty string for relative URLs
        console.log('🔍 Miniapp context: Using relative URLs');
      } else {
        // In web context, use absolute URLs
        baseCandidates.push('https://fc-footy.vercel.app'); // Primary - stable production URL
        
        // Only add localhost if we're in development
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          baseCandidates.push('http://localhost:3000');
        }
      }

      let standings = null;
      let sourceUsed = '';
      
      for (const base of baseCandidates) {
        try {
          // Construct the URL based on whether base is empty (relative) or not (absolute)
          const url = base ? `${base}/api/fpl-league?leagueId=18526` : `/api/fpl-league?leagueId=18526`;
          console.log(`🔍 Trying to fetch FPL data from: ${url}`);
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            // Remove mode: 'cors' as it can cause issues in miniapp context
            // Let the browser handle CORS automatically
          });
          
          if (response.ok) {
            const data = await response.json();
            standings = data.standings.results;
            sourceUsed = base;
            console.log(`✅ Successfully fetched from: ${base}`);
            break;
          } else {
            console.log(`❌ Failed to fetch from ${base}: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.log(`❌ Error fetching from ${base}:`, error.message);
          // If it's a CORS error, log it specifically
          if (error.message.includes('CORS') || error.message.includes('cors')) {
            console.log(`🚫 CORS error detected for ${base} - skipping to next source`);
          }
        }
      }

      if (!standings) {
        console.log('🔄 Falling back to direct FPL API...');
        try {
          const response = await fetch('https://fantasy.premierleague.com/api/leagues-classic/18526/standings/', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            standings = data.standings.results;
            sourceUsed = 'FPL API (direct)';
            console.log('✅ Successfully fetched from direct FPL API');
          } else {
            throw new Error(`FPL API returned ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          console.error('❌ Failed to fetch from direct FPL API:', error.message);
          // If all else fails, throw the error to be caught by the outer try-catch
          throw new Error(`Failed to fetch FPL data from all sources: ${error.message}`);
        }
      }

      setFplData(standings);
      updateStep(1, "completed", { 
        count: standings.length,
        source: sourceUsed 
      });
      setCurrentStep(2);
    } catch (error) {
      console.error('Error loading FPL data:', error);
      updateStep(1, "error", { error: error.message });
    }
  };

  // Step 2: Process Manager FIDs
  const processManagerFIDs = async () => {
    updateStep(2, "loading");
    try {
      const fantasyManagersLookup = await import('../../data/fantasy-managers-lookup.json');
      const managersWithFIDs: FPLManager[] = [];
      
      for (const entry of fplData) {
        const lookupEntry = fantasyManagersLookup.default.find(
          (lookup: any) => lookup.entry_id === entry.entry
        );
        
        if (lookupEntry && lookupEntry.fid) {
          const username = await fetchUsernameByFid(lookupEntry.fid);
          if (username) {
            managersWithFIDs.push({
              ...entry,
              fid: lookupEntry.fid,
              username,
            });
          } else {
            // Fallback to team_name
            managersWithFIDs.push({
              ...entry,
              fid: lookupEntry.fid,
              username: lookupEntry.team_name.toLowerCase().replace(/[^a-z0-9]/g, ''),
            });
          }
        }
      }
      
      setManagersWithFIDs(managersWithFIDs.sort((a, b) => b.total - a.total));
      updateStep(2, "completed", { count: managersWithFIDs.length });
      setCurrentStep(3);
    } catch (error) {
      console.error('Error processing manager FIDs:', error);
      updateStep(2, "error", { error: error.message });
    }
  };

  const fetchUsernameByFid = async (fid: number): Promise<string | null> => {
    try {
      const response = await fetch(`https://hub.merv.fun/v1/userDataByFid?fid=${fid}`);
      if (response.ok) {
        const data = await response.json();
        return data.username?.toLowerCase() || null;
      }
    } catch (error) {
      console.error(`Error fetching username for FID ${fid}:`, error);
    }
    return null;
  };

  // Step 3: Generate Infographic
  const generateInfographic = async () => {
    updateStep(3, "loading");
    try {
      console.log('🔍 Debug: Sending to infographic API:', {
        fplDataCount: managersWithFIDs.length,
        sampleData: managersWithFIDs.slice(0, 2)
      });
      
      const response = await fetch('/api/gameweek-infographic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fplData: managersWithFIDs,
          gameWeek,
          leagueName: "Farcaster Fantasy League"
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setInfographicUrl(result.ipfsUrl);
        updateStep(3, "completed", { url: result.ipfsUrl });
        setCurrentStep(4);
      } else {
        throw new Error(result.error || 'Failed to generate infographic');
      }
    } catch (error) {
      console.error('Error generating infographic:', error);
      updateStep(3, "error", { error: error.message });
    }
  };

  // Step 4: Generate Cast Text
  const generateCastText = () => {
    updateStep(4, "loading");
    try {
      const sortedByTotal = [...managersWithFIDs].sort((a, b) => b.total - a.total);
      const top3 = sortedByTotal.slice(0, 3);
      const bottom3 = sortedByTotal.slice(-3);

      const text = `🎮 Game Week ${gameWeek} Summary - Farcaster Fantasy League! 🏆

🥇 @${top3[0].username} - The king stays king! 👑⚽️ (${top3[0].total}pts)
🥈 @${top3[1].username} - So close, yet so far! 😅⚽️ (${top3[1].total}pts)
🥉 @${top3[2].username} - Bronze medal energy! 🎯⚽️ (${top3[2].total}pts)

😅 @${bottom3[2].username} - At least you're not last... oh wait! 😂⚽️ (${bottom3[2].total}pts)
🤔 @${bottom3[1].username} - Maybe next week? 🤞⚽️ (${bottom3[1].total}pts)
💪 @${bottom3[0].username} - Keep fighting! 💪⚽️ (${bottom3[0].total}pts)

⚽ Keep the banter friendly and the competition fierce! 🔥`;

      setCastText(text);
      updateStep(4, "completed", { preview: text.substring(0, 100) + "..." });
      setCurrentStep(5);
    } catch (error) {
      console.error('Error generating cast text:', error);
      updateStep(4, "error", { error: error.message });
    }
  };

  // Step 5: Post to Farcaster
  const postToFarcaster = async () => {
    updateStep(5, "loading");
    try {
      await sdk.actions.ready();
      
      const embeds = ['https://fc-footy.vercel.app'];
      if (infographicUrl) {
        embeds.push(infographicUrl);
      }

      await sdk.actions.composeCast({
        text: castText,
        embeds,
        channelKey: 'football'
      });

      updateStep(5, "completed", { success: true });
      setResponseMessage('Cast posted successfully! 🎉');
    } catch (error) {
      console.error('Error posting cast:', error);
      updateStep(5, "error", { error: error.message });
      setResponseMessage('Failed to post cast. Please try again.');
    }
  };

  const executeStep = async (stepId: number) => {
    switch (stepId) {
      case 1: await loadFPLData(); break;
      case 2: await processManagerFIDs(); break;
      case 3: await generateInfographic(); break;
      case 4: generateCastText(); break;
      case 5: await postToFarcaster(); break;
    }
  };

  const resetAll = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: "pending" as const })));
    setCurrentStep(1);
    setFplData([]);
    setManagersWithFIDs([]);
    setCastText("");
    setInfographicUrl("");
    setResponseMessage("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-notWhite">Game Week Summary - Step by Step</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-lightPurple text-sm">Game Week:</label>
            <input
              type="number"
              value={gameWeek}
              onChange={(e) => setGameWeek(parseInt(e.target.value) || 1)}
              min="1"
              max="38"
              className="w-16 px-2 py-1 bg-darkPurple border border-limeGreenOpacity rounded text-lightPurple text-center"
            />
          </div>
          <button
            onClick={resetAll}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Response Message */}
      {responseMessage && (
        <div className="p-4 bg-purplePanel rounded-lg border border-limeGreenOpacity">
          <p className="text-lightPurple">{responseMessage}</p>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-4 rounded-lg border-2 ${
              step.status === "completed" 
                ? "border-green-500 bg-green-900 bg-opacity-20" 
                : step.status === "loading"
                ? "border-yellow-500 bg-yellow-900 bg-opacity-20"
                : step.status === "error"
                ? "border-red-500 bg-red-900 bg-opacity-20"
                : "border-limeGreenOpacity bg-darkPurple"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step.status === "completed" 
                    ? "bg-green-500 text-white" 
                    : step.status === "loading"
                    ? "bg-yellow-500 text-white"
                    : step.status === "error"
                    ? "bg-red-500 text-white"
                    : "bg-gray-600 text-gray-300"
                }`}>
                  {step.status === "completed" ? "✓" : 
                   step.status === "loading" ? "⟳" :
                   step.status === "error" ? "✗" : step.id}
                </div>
                <div>
                  <h4 className="text-notWhite font-semibold">{step.title}</h4>
                  <p className="text-lightPurple text-sm">{step.description}</p>
                                     {step.data && (
                     <p className="text-xs text-gray-400 mt-1">
                       {step.data.count && `${step.data.count} items`}
                       {step.data.source && ` | Source: ${step.data.source}`}
                       {step.data.error && `Error: ${step.data.error}`}
                       {step.data.url && `URL: ${step.data.url.substring(0, 50)}...`}
                       {step.data.preview && `Preview: ${step.data.preview}`}
                     </p>
                   )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {step.status === "pending" && currentStep === step.id && (
                  <button
                    onClick={() => executeStep(step.id)}
                    className="px-4 py-2 bg-deepPink text-white rounded-lg hover:bg-fontRed"
                  >
                    Execute
                  </button>
                )}
                {step.status === "error" && (
                  <button
                    onClick={() => executeStep(step.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Retry
                  </button>
                )}
                {step.status === "completed" && step.id < 5 && (
                  <button
                    onClick={() => executeStep(step.id + 1)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Next Step
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cast Preview */}
      {castText && (
        <div className="p-4 bg-darkPurple rounded-lg border border-limeGreenOpacity">
          <h4 className="text-notWhite font-semibold mb-2">Cast Preview</h4>
          <div className="whitespace-pre-wrap text-lightPurple font-mono text-sm bg-gray-900 p-3 rounded">
            {castText}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <h4 className="text-notWhite font-semibold mb-2">Quick Actions</h4>
        <div className="flex space-x-2">
          <button
            onClick={() => executeStep(1)}
            disabled={steps[0].status === "loading"}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            Step 1: Load Data
          </button>
          <button
            onClick={() => executeStep(2)}
            disabled={steps[1].status === "loading" || steps[0].status !== "completed"}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            Step 2: Process FIDs
          </button>
          <button
            onClick={() => executeStep(3)}
            disabled={steps[2].status === "loading" || steps[1].status !== "completed"}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            Step 3: Generate Infographic
          </button>
          <button
            onClick={() => executeStep(4)}
            disabled={steps[3].status === "loading" || steps[2].status !== "completed"}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            Step 4: Generate Cast
          </button>
          <button
            onClick={() => executeStep(5)}
            disabled={steps[4].status === "loading" || steps[3].status !== "completed"}
            className="px-3 py-1 bg-deepPink text-white rounded text-sm disabled:opacity-50"
          >
            Step 5: Post Cast
          </button>
        </div>
      </div>
    </div>
  );
}
