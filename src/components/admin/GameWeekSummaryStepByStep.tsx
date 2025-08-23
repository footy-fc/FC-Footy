"use client";

import { useState } from "react";
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

interface StepData {
  count?: number;
  managersWithFIDs?: number;
  source?: string;
  selectedType?: string;
  error?: string;
  url?: string;
  preview?: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  status: "pending" | "loading" | "completed" | "error";
  data?: StepData;
}

type CastType = "topBottom" | "biggestMovers" | "worstCaptainPicks";

export default function GameWeekSummaryStepByStep() {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, title: "Load FPL Data & Process FIDs (Optional)", description: "Fetch standings and match with Farcaster usernames", status: "pending" },
    { id: 2, title: "Select Cast Type", description: "Choose the type of cast to generate", status: "pending" },
    { id: 3, title: "Post to Farcaster", description: "Compose and publish the cast with infographic", status: "pending" }
  ]);
  
  const [managersWithFIDs, setManagersWithFIDs] = useState<FPLManager[]>([]);
  const [gameWeek, setGameWeek] = useState(1);
  const [responseMessage, setResponseMessage] = useState("");
  const [selectedCastType, setSelectedCastType] = useState<CastType>("topBottom");
  const [worstCaptainPicks, setWorstCaptainPicks] = useState<any[]>([]);

  const updateStep = (stepId: number, status: Step["status"], data?: StepData) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, data }
        : step
    ));
  };

  // Step 1: Load FPL Data & Process FIDs (Combined)
  const loadFPLDataAndProcessFIDs = async () => {
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
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`❌ Error fetching from ${base}:`, errorMessage);
          // If it's a CORS error, log it specifically
          if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
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
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('❌ Failed to fetch from direct FPL API:', errorMessage);
          // If all else fails, throw the error to be caught by the outer try-catch
          throw new Error(`Failed to fetch FPL data from all sources: ${errorMessage}`);
        }
      }

      // We don't need to store fplData separately since we process it immediately
      console.log(`📊 FPL Data: ${standings.length} total managers`);

      // Now process FIDs
      console.log('🔍 Processing manager FIDs...');
      const fantasyManagersLookup = await import('../../data/fantasy-managers-lookup.json');
      const managersWithFIDs: FPLManager[] = [];
      
      interface LookupEntry {
        entry_id: number;
        fid: number;
        team_name: string;
      }

      for (const entry of standings) {
        const lookupEntry = fantasyManagersLookup.default.find(
          (lookup: LookupEntry) => lookup.entry_id === entry.entry
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
      console.log(`📊 Managers with FIDs: ${managersWithFIDs.length}`);
      
      updateStep(1, "completed", { 
        count: standings.length,
        managersWithFIDs: managersWithFIDs.length,
        source: sourceUsed 
      });
      setCurrentStep(2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error loading FPL data and processing FIDs:', errorMessage);
      updateStep(1, "error", { error: errorMessage });
    }
  };

  // Analyze worst captain picks for gameweek 1
  const analyzeWorstCaptainPicks = async () => {
    console.log('🔍 Analyzing worst captain picks for gameweek 1...');
    
    const worstPicks: any[] = [];
    
    // Use existing managers with FIDs
    const managersToAnalyze = managersWithFIDs;
    
    for (const manager of managersToAnalyze) {
      try {
        // Fetch manager picks for gameweek 1
        const response = await fetch(`/api/manager-picks?fid=${manager.fid}&gameweek=1`);
        
        if (response.ok) {
          const picksData = await response.json();
          
          // Find captain and vice captain
          const captain = picksData.picks.find((p: any) => p.is_captain);
          const viceCaptain = picksData.picks.find((p: any) => p.is_vice_captain);
          
          if (captain && viceCaptain && captain.player && viceCaptain.player) {
            // Calculate points (captain gets 2x multiplier, vice captain gets 1x if captain doesn't play)
            const captainPoints = captain.player.total_points * 2;
            const viceCaptainPoints = viceCaptain.player.total_points;
            
            // If vice captain outscored captain, this is a bad captain choice
            if (viceCaptainPoints > captainPoints) {
              const pointsDifference = viceCaptainPoints - captainPoints;
              
              worstPicks.push({
                manager: manager.username || manager.entry_name,
                fid: manager.fid,
                captain: {
                  name: captain.player.web_name,
                  team: captain.player.team?.short_name,
                  points: captain.player.total_points,
                  captainPoints: captainPoints
                },
                viceCaptain: {
                  name: viceCaptain.player.web_name,
                  team: viceCaptain.player.team?.short_name,
                  points: viceCaptain.player.total_points,
                  viceCaptainPoints: viceCaptainPoints
                },
                pointsDifference: pointsDifference,
                missedPoints: pointsDifference
              });
            }
          }
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error analyzing picks for ${manager.username}:`, error);
      }
    }
    
    // Sort by points difference (worst first)
    worstPicks.sort((a, b) => b.pointsDifference - a.pointsDifference);
    
    console.log(`📊 Found ${worstPicks.length} managers with bad captain choices`);
    setWorstCaptainPicks(worstPicks);
    
    return worstPicks;
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

  // Step 2: Select Cast Type
  const selectCastType = () => {
    updateStep(2, "loading");
    try {
      // This step is just for selection, no processing needed
      updateStep(2, "completed", { selectedType: selectedCastType });
      setCurrentStep(3);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error selecting cast type:', errorMessage);
      updateStep(2, "error", { error: errorMessage });
    }
  };



  // Step 3: Post to Farcaster (with infographic generation and cast text)
  const postToFarcaster = async () => {
    updateStep(3, "loading");
    try {
      console.log('🔍 Admin: Starting combined infographic generation and cast posting...');
      
      // Use demo data if no FPL data has been loaded (Step 1 skipped)
      let dataToUse = managersWithFIDs;
      if (dataToUse.length === 0) {
        console.log('🔍 Admin: No FPL data loaded, using demo data...');
        dataToUse = [
          { username: "je11yf15h", entry: 192153, total: 91, entry_name: "JE11YF15H 🍖🔵-", player_name: "je11yf15h", event_total: 91, rank: 1, fid: 249647 },
          { username: "femmie", entry: 215181, total: 89, entry_name: "FeMMie", player_name: "femmie", event_total: 89, rank: 2, fid: 267104 },
          { username: "ghost", entry: 200716, total: 87, entry_name: "Ghost 🎩", player_name: "ghost", event_total: 87, rank: 3, fid: 528707 },
          { username: "kimken", entry: 204596, total: 85, entry_name: "kimken", player_name: "kimken", event_total: 85, rank: 4, fid: 844615 },
          { username: "henry", entry: 179856, total: 83, entry_name: "Henry Adewole 👾", player_name: "henry", event_total: 83, rank: 5, fid: 718134 },
          { username: "milo", entry: 23272, total: 26, entry_name: "Milo Bowman  🇬🇧", player_name: "milo", event_total: 26, rank: 96, fid: 231807 },
          { username: "vyenepaul", entry: 47421, total: 29, entry_name: "Vyenepaul11", player_name: "vyenepaul", event_total: 29, rank: 95, fid: 1136655 },
          { username: "zipar", entry: 55728, total: 31, entry_name: "Zipar 🔵🟦", player_name: "zipar", event_total: 31, rank: 94, fid: 317946 },
          { username: "kazani", entry: 56917, total: 33, entry_name: "kazani.base.eth 🦂", player_name: "kazani", event_total: 33, rank: 93, fid: 4926 },
          { username: "supertaster", entry: 100599, total: 35, entry_name: "Supertaster.eth", player_name: "supertaster", event_total: 35, rank: 92, fid: 297066 }
        ];
      }
      
      // Process the data to get top/bottom performers
      const sortedByTotal = [...dataToUse].sort((a, b) => b.total - a.total);
      
      // Get top 5 and bottom 5
      const top5 = sortedByTotal.slice(0, 5);
      const bottom5 = sortedByTotal.slice(-5);
      
      console.log('🔍 Admin: Data:', {
        top5Count: top5.length,
        bottom5Count: bottom5.length,
        gameWeek,
        sampleTop5: top5[0],
        sampleBottom5: bottom5[0]
      });

      // Generate cast text
      let castText = "";
      if (selectedCastType === "topBottom") {
        const topBanter = generateTopPerformersBanter(top5);
        const bottomBanter = generateBottomPerformersBanter(bottom5);

        castText = `🎮 Game Week ${gameWeek} Summary - Farcaster Fantasy League! 🏆

${topBanter}

${bottomBanter}

⚽ Keep the banter friendly and the competition fierce! 🔥`;
      } else if (selectedCastType === "biggestMovers") {
        castText = `📈 Game Week ${gameWeek} - Biggest Movers! 🚀

🎯 Coming soon: Highlighting managers with the biggest rank changes this week!

⚽ Stay tuned for more exciting content! 🔥`;
      } else if (selectedCastType === "worstCaptainPicks") {
        // Analyze worst captain picks first
        const worstPicks = await analyzeWorstCaptainPicks();
        
        if (worstPicks.length > 0) {
          const top3Worst = worstPicks.slice(0, 3);
          const worstBanter = generateWorstCaptainPicksBanter(top3Worst);
          
          castText = `👑 Game Week 1 - Worst Captain Picks! 😅

${worstBanter}

⚽ Sometimes the vice captain knows best! 🔥`;
        } else {
          castText = `👑 Game Week 1 - Captain Analysis! 🎯

🎉 Great news! No managers had their vice captain outscore their captain this week!

⚽ Everyone made solid captain choices! 🔥`;
        }
      }

      // Create template URL with data
                        const templateUrl = `https://fc-footy.vercel.app/templates/gameweek-table-toppers?` + 
                    `top5=${encodeURIComponent(JSON.stringify(top5))}&` +
                    `bottom5=${encodeURIComponent(JSON.stringify(bottom5))}&` +
                    `gameWeek=${gameWeek}`;

      console.log('🔍 Admin: Template URL created:', templateUrl);
      console.log('🔍 Admin: Cast text generated:', castText.substring(0, 100) + '...');

      // Prepare embeds
      const baseEmbeds = ['https://fc-footy.vercel.app'];
      const finalEmbeds = [...baseEmbeds, templateUrl];

      console.log('🔍 Admin: Final embeds being sent to Farcaster:', finalEmbeds);

      // Post to Farcaster
      await sdk.actions.ready();
      await sdk.actions.composeCast({
        text: castText,
        embeds: finalEmbeds as [string, string] | [string] | [],
        channelKey: 'football'
      });

      updateStep(3, "completed", { url: "Cast posted successfully with infographic" });
      setResponseMessage('Cast posted successfully with infographic! 🎉');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Admin: Error in combined post process:', errorMessage);
      updateStep(3, "error", { error: errorMessage });
      setResponseMessage('Failed to post cast. Please try again.');
    }
  };

  // Helper functions for cast text generation
  const generateTopPerformersBanter = (top5: FPLManager[]) => {
    const banterLines: string[] = [];
    const medals = ['🥇', '🥈', '🥉', '🏅', '🎖️'];
    
    top5.forEach((manager, index) => {
      const medal = medals[index] || '🏆';
      const banter = `${medal} @${manager.username} - ${manager.total}pts`;
      banterLines.push(banter);
    });
    
    return banterLines.join('\n');
  };

  const generateBottomPerformersBanter = (bottom5: FPLManager[]) => {
    const banterLines: string[] = [];
    const reactions = ['😅', '🤔', '😬', '😱', '💀'];
    
    bottom5.reverse().forEach((manager, index) => {
      const reaction = reactions[index] || '😅';
      const banter = `${reaction} @${manager.username} - ${manager.total}pts`;
      banterLines.push(banter);
    });
    
    return banterLines.join('\n');
  };

  const generateWorstCaptainPicksBanter = (worstPicks: any[]) => {
    const banterLines: string[] = [];
    const reactions = ['😅', '🤦‍♂️', '😬'];
    
    worstPicks.forEach((pick, index) => {
      const reaction = reactions[index] || '😅';
      const banter = `${reaction} @${pick.manager} - C: ${pick.captain.name} (${pick.captain.captainPoints}pts) vs VC: ${pick.viceCaptain.name} (${pick.viceCaptain.points}pts) - Missed ${pick.missedPoints}pts!`;
      banterLines.push(banter);
    });
    
    return banterLines.join('\n');
  };

  const executeStep = async (stepId: number) => {
    switch (stepId) {
      case 1: await loadFPLDataAndProcessFIDs(); break;
      case 2: selectCastType(); break;
      case 3: await postToFarcaster(); break;
    }
  };

  // Check if we can proceed to a step (Step 1 is optional)
  const canProceedToStep = (stepId: number) => {
    if (stepId === 1) return true; // Step 1 can always be executed
    if (stepId === 2) return true; // Step 2 can be executed even without Step 1
    if (stepId === 3) return steps[1].status === "completed"; // Step 3 needs Step 2 completed
    return false;
  };

  const resetAll = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: "pending" as const })));
    setCurrentStep(1);
    // No need to reset fplData since we don't store it separately
    setManagersWithFIDs([]);
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
                      {step.data.count && `${step.data.count} total managers`}
                      {step.data.managersWithFIDs && ` | ${step.data.managersWithFIDs} with FIDs`}
                      {step.data.source && ` | Source: ${step.data.source}`}
                      {step.data.selectedType && ` | Type: ${step.data.selectedType}`}
                      {step.data.error && `Error: ${step.data.error}`}
                      {step.data.url && `URL: ${step.data.url.substring(0, 50)}...`}
                      {step.data.preview && `Preview: ${step.data.preview}`}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {step.status === "pending" && currentStep === step.id && canProceedToStep(step.id) && (
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
                {step.status === "completed" && step.id < 3 && canProceedToStep(step.id + 1) && (
                  <button
                    onClick={() => executeStep(step.id + 1)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Next Step
                  </button>
                )}
              </div>
            </div>
            
            {/* Cast Type Selection for Step 2 */}
            {step.id === 2 && step.status === "pending" && currentStep === 2 && (
              <div className="mt-4 p-4 bg-darkPurple rounded-lg border border-limeGreenOpacity">
                <h5 className="text-notWhite font-semibold mb-3">Select Cast Type:</h5>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="castType"
                      value="topBottom"
                      checked={selectedCastType === "topBottom"}
                      onChange={(e) => setSelectedCastType(e.target.value as CastType)}
                      className="text-deepPink"
                    />
                    <div>
                      <span className="text-lightPurple font-medium">🏆 Top 3 vs Bottom 3</span>
                      <p className="text-xs text-gray-400">Congratulate top performers and playfully mention bottom performers</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="castType"
                      value="biggestMovers"
                      checked={selectedCastType === "biggestMovers"}
                      onChange={(e) => setSelectedCastType(e.target.value as CastType)}
                      className="text-deepPink"
                    />
                    <div>
                      <span className="text-lightPurple font-medium">📈 Biggest Movers</span>
                      <p className="text-xs text-gray-400">Highlight managers with biggest rank changes this week (Coming Soon)</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="castType"
                      value="worstCaptainPicks"
                      checked={selectedCastType === "worstCaptainPicks"}
                      onChange={(e) => setSelectedCastType(e.target.value as CastType)}
                      className="text-deepPink"
                    />
                    <div>
                      <span className="text-lightPurple font-medium">👑 Worst Captain Picks</span>
                      <p className="text-xs text-gray-400">Find managers whose vice captain outscored their captain in GW1</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>



      {/* Quick Actions */}
      <div className="p-4 bg-darkPurple rounded-lg border border-limeGreenOpacity">
        <h4 className="text-notWhite font-semibold mb-2">Quick Actions</h4>
        <div className="flex space-x-2 flex-wrap">
          <button
            onClick={() => executeStep(1)}
            disabled={steps[0].status === "loading"}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            Step 1: Load & Process
          </button>
          <button
            onClick={() => executeStep(2)}
            disabled={steps[1].status === "loading"}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            Step 2: Select Type
          </button>
          <button
            onClick={() => executeStep(3)}
            disabled={steps[2].status === "loading" || steps[1].status !== "completed"}
            className="px-3 py-1 bg-deepPink text-white rounded text-sm disabled:opacity-50"
          >
            Step 3: Post Cast
          </button>
          <button
            onClick={analyzeWorstCaptainPicks}
            disabled={managersWithFIDs.length === 0}
            className="px-3 py-1 bg-orange-600 text-white rounded text-sm disabled:opacity-50"
          >
            Analyze Worst Captain Picks
          </button>
        </div>
      </div>

      {/* Worst Captain Picks Results */}
      {worstCaptainPicks.length > 0 && (
        <div className="p-4 bg-darkPurple rounded-lg border border-limeGreenOpacity">
          <h4 className="text-notWhite font-semibold mb-3">👑 Worst Captain Picks - Game Week 1</h4>
          <div className="space-y-3">
            {worstCaptainPicks.slice(0, 5).map((pick, index) => (
              <div key={index} className="p-3 bg-purplePanel rounded border border-limeGreenOpacity">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lightPurple font-medium">@{pick.manager}</p>
                    <p className="text-sm text-gray-400">
                      Captain: {pick.captain.name} ({pick.captain.team}) - {pick.captain.captainPoints}pts
                    </p>
                    <p className="text-sm text-gray-400">
                      Vice Captain: {pick.viceCaptain.name} ({pick.viceCaptain.team}) - {pick.viceCaptain.points}pts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold">-{pick.missedPoints}pts</p>
                    <p className="text-xs text-gray-400">Missed</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
