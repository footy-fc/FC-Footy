'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Chart, ChartData } from 'chart.js/auto';

interface PlayerData {
  x: number;
  y: number;
  label: string;
  team: number;
  teamName: string;
  position: number;
}

interface ChartPoint {
  x: number;
  y: number;
  playerData: PlayerData;
}

interface FPLPlayer {
  web_name: string;
  now_cost: number;
  total_points: number;
  team: number;
  element_type: number;
  status: string;
}

interface FPLTeam {
  id: number;
  name: string;
}

interface FPLBootstrapData {
  elements: FPLPlayer[];
  teams: FPLTeam[];
}



const FPLScatterplot: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [showNames, setShowNames] = useState(false);
  const [showLogos, setShowLogos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visiblePositions, setVisiblePositions] = useState<Set<number>>(new Set([1, 2, 3, 4]));

  // Team logo mapping
  const teamLogoMapping: Record<string, string> = {
    "Arsenal": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/ars.png",
    "Aston Villa": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/avl.png",
    "Bournemouth": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/bou.png",
    "Brentford": "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/fra.1/bre.png",
    "Brighton": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/bha.png",
    "Chelsea": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/che.png",
    "Crystal Palace": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/cry.png",
    "Everton": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/eve.png",
    "Fulham": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/ful.png",
    "Man Utd": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/man.png",
    "Newcastle": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/new.png",
    "Nott'm Forest": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/nfo.png",
    "Spurs": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/tot.png",
    "West Ham": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/whu.png",
    "Wolves": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/wol.png",
    "Burnley": "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.2/bur.png",
    "Luton": "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.2/lut.png",
    "Sheffield United": "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.2/shu.png",
    "Sunderland": "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.2/sun.png",
    "Leeds": "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.2/lee.png",
    "Man City": "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/mnc.png",
    "Liverpool": "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/liv.png"
  };

  const positions = {
    1: { name: 'Goalkeepers', color: '#FEA282' },
    2: { name: 'Defenders', color: '#32CD32' },
    3: { name: 'Midfielders', color: '#C0B2F0' },
    4: { name: 'Forwards', color: '#FFD700' }
  };

  const calculateLinearRegression = (data: PlayerData[]) => {
    if (data.length < 2) return [];
    
    // Validate input data
    const validData = data.filter(point => 
      !isNaN(point.x) && !isNaN(point.y) && 
      isFinite(point.x) && isFinite(point.y)
    );
    
    if (validData.length < 2) {
      console.warn('⚠️ Not enough valid data points for regression:', validData.length);
      return [];
    }
    
    const n = validData.length;
    const sumX = validData.reduce((sum, point) => sum + point.x, 0);
    const sumY = validData.reduce((sum, point) => sum + point.y, 0);
    const sumXY = validData.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = validData.reduce((sum, point) => sum + point.x * point.x, 0);
    
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) {
      console.warn('⚠️ Cannot calculate regression: denominator is zero');
      return [];
    }
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    // Validate slope and intercept
    if (!isFinite(slope) || !isFinite(intercept)) {
      console.warn('⚠️ Invalid regression parameters:', { slope, intercept });
      return [];
    }
    
    const minX = Math.min(...validData.map(d => d.x));
    const maxX = Math.max(...validData.map(d => d.x));
    
    const y1 = slope * minX + intercept;
    const y2 = slope * maxX + intercept;
    
    // Validate regression line points
    if (!isFinite(y1) || !isFinite(y2)) {
      console.warn('⚠️ Invalid regression line points:', { minX, maxX, y1, y2 });
      return [];
    }
    
    return [
      { x: minX, y: y1 },
      { x: maxX, y: y2 }
    ];
  };

  const fetchFPLData = async (): Promise<FPLBootstrapData> => {
    try {
      console.log('🔍 Fetching FPL data...');
      const response = await fetch('/api/fpl-bootstrap');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch FPL data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 FPL data received:', {
        elementsCount: data.elements?.length || 0,
        teamsCount: data.teams?.length || 0,
        hasElements: !!data.elements,
        hasTeams: !!data.teams,
        sampleElement: data.elements?.[0],
        sampleTeam: data.teams?.[0]
      });
      
      return data;
    } catch (err) {
      console.error('❌ Error fetching FPL data:', err);
      throw err;
    }
  };

  const removeTextLabels = () => {
    const labels = document.querySelectorAll('.player-label');
    const logos = document.querySelectorAll('.team-logo');
    labels.forEach(label => label.remove());
    logos.forEach(logo => logo.remove());
  };

  const updateChartLabels = () => {
    removeTextLabels();
    
    if (!chartInstance.current) return;
    
    const chart = chartInstance.current;
    const chartContainer = chartRef.current?.parentElement;
    
    if (!chartContainer) return;
    
    chart.data.datasets.forEach((dataset, index) => {
      if (index % 2 === 0 && !dataset.hidden) {
        dataset.data.forEach((point) => {
          if (!point || typeof point === 'number' || Array.isArray(point)) return;
          
          const chartPoint = point as ChartPoint;
          const player = chartPoint.playerData;
          
          if (player) {
            // Add player name if enabled
            if (showNames) {
              const textElement = document.createElement('div');
              textElement.className = 'player-label';
              textElement.textContent = player.label;
              textElement.style.cssText = `
                position: absolute;
                font-size: 10px;
                color: white;
                background: rgba(0,0,0,0.7);
                padding: 2px 4px;
                border-radius: 3px;
                pointer-events: none;
                z-index: 10;
                white-space: nowrap;
              `;
              
              // const canvasRect = chart.canvas.getBoundingClientRect();
              const chartArea = chart.chartArea;
              const x = chartArea.left + (chartPoint.x - chart.scales.x.min) / (chart.scales.x.max - chart.scales.x.min) * chartArea.width;
              const y = chartArea.top + (chart.scales.y.max - chartPoint.y) / (chart.scales.y.max - chart.scales.y.min) * chartArea.height;
              
              textElement.style.left = (x + 8) + 'px';
              textElement.style.top = (y + 8) + 'px';
              
              chartContainer.appendChild(textElement);
            }
            
            // Add team logo if enabled
            if (showLogos) {
              const logoElement = document.createElement('img');
              logoElement.className = 'team-logo';
              const teamName = player.teamName;
              const logoUrl = teamLogoMapping[teamName];
              
              if (logoUrl) {
                logoElement.src = logoUrl;
              } else {
                logoElement.style.display = 'none';
              }
              
              logoElement.style.cssText = `
                position: absolute;
                width: 16px;
                height: 16px;
                pointer-events: none;
                z-index: 0;
                border-radius: 2px;
              `;
              
              //const canvasRect = chart.canvas.getBoundingClientRect();
              const chartArea = chart.chartArea;
              const x = chartArea.left + (chartPoint.x - chart.scales.x.min) / (chart.scales.x.max - chart.scales.x.min) * chartArea.width;
              const y = chartArea.top + (chart.scales.y.max - chartPoint.y) / (chart.scales.y.max - chart.scales.y.min) * chartArea.height;
              
              logoElement.style.left = (x - 8) + 'px';
              logoElement.style.top = (y - 8) + 'px';
              
              logoElement.onerror = function() {
                this.style.display = 'none';
              };
              
              chartContainer.appendChild(logoElement);
            }
          }
        });
      }
    });
  };



  useEffect(() => {
    const initChart = async () => {
      try {
        setLoading(true);
        const bootstrapData = await fetchFPLData();
        
        // Process players data
        console.log('🔍 Processing players data...');
        console.log('📊 Raw elements count:', bootstrapData.elements?.length || 0);
        
        const validPlayers = bootstrapData.elements
          .filter((player: FPLPlayer) => player.status === 'a' && player.total_points > 0)
          .map((player: FPLPlayer) => {
            const x = player.now_cost / 10;
            const y = player.total_points;
            
            // Validate data points
            if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
              console.warn('⚠️ Invalid data point:', { player: player.web_name, x, y, now_cost: player.now_cost, total_points: player.total_points });
              return null;
            }
            
            return {
              x,
              y,
              playerData: {
                x,
                y,
                label: player.web_name,
                team: player.team,
                teamName: bootstrapData.teams.find((t: FPLTeam) => t.id === player.team)?.name || 'Unknown',
                position: player.element_type
              }
            };
          })
          .filter(Boolean) as ChartPoint[];
        
        console.log('✅ Valid players count:', validPlayers.length);
        console.log('📊 Sample valid player:', validPlayers[0]);
        
        // Check for any remaining invalid data
        const invalidData = validPlayers.filter(p => isNaN(p.x) || isNaN(p.y) || !isFinite(p.x) || !isFinite(p.y));
        if (invalidData.length > 0) {
          console.error('❌ Found invalid data points:', invalidData);
        }

        // Group by position
        const playersByPosition: Record<number, ChartPoint[]> = {};
        validPlayers.forEach((player: ChartPoint) => {
          const position = player.playerData.position;
          if (!playersByPosition[position]) {
            playersByPosition[position] = [];
          }
          playersByPosition[position].push(player);
        });

        // Create datasets
        console.log('📊 Players by position:', Object.keys(playersByPosition).map(pos => `${pos}: ${playersByPosition[parseInt(pos)].length}`));
        
        const datasets: ChartData<'scatter'>['datasets'] = [];
        Object.entries(playersByPosition).forEach(([position, players]) => {
          const posNum = parseInt(position);
          const positionInfo = positions[posNum as keyof typeof positions];
          
          if (positionInfo && players.length > 0) {
            // Validate scatter data
            const validScatterData = players.filter(p => 
              !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y)
            );
            
            if (validScatterData.length > 0) {
              // Scatter dataset
              datasets.push({
                label: positionInfo.name,
                data: validScatterData,
                backgroundColor: positionInfo.color,
                borderColor: positionInfo.color,
                pointRadius: 4,
                pointHoverRadius: 6
              });
              
              // Regression line dataset
              const regressionData = calculateLinearRegression(validScatterData.map(p => p.playerData));
              if (regressionData.length > 0) {
                datasets.push({
                  label: `${positionInfo.name} Trend`,
                  data: regressionData,
                  backgroundColor: positionInfo.color,
                  borderColor: positionInfo.color,
                  pointRadius: 0,
                  pointHoverRadius: 0,
                  showLine: true,
                  fill: false,
                  tension: 0,
                  borderWidth: 2,
                  borderDash: [5, 5]
                });
              }
            } else {
              console.warn(`⚠️ No valid scatter data for position ${position}`);
            }
          }
        });

        console.log('🎨 Creating chart with datasets:', datasets.length);
        
        if (chartRef.current) {
          const ctx = chartRef.current.getContext('2d');
          if (ctx) {
            // Destroy existing chart
            if (chartInstance.current) {
              chartInstance.current.destroy();
            }

            console.log('📊 Chart data structure:', {
              datasetsCount: datasets.length,
              firstDataset: datasets[0],
              sampleDataPoint: datasets[0]?.data?.[0]
            });

            chartInstance.current = new Chart(ctx, {
              type: 'scatter',
              data: {
                datasets
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: '#181424',
                    titleColor: '#FEA282',
                    bodyColor: '#C0B2F0',
                    borderColor: 'rgba(162, 230, 52, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                      label: function(context) {
                        const player = (context.raw as ChartPoint).playerData;
                        if (player) {
                          return [
                            player.label,
                            `${player.teamName}`,
                            `£${player.x}m`,
                            `${player.y} points `,
                            `${positions[player.position as keyof typeof positions]?.name}`
                          ];
                        }
                        return context.parsed.y.toString();
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Cost (£m)',
                      color: '#C0B2F0'
                    },
                    ticks: {
                      color: '#C0B2F0'
                    },
                    grid: {
                      color: 'rgba(162, 230, 52, 0.1)'
                    }
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Total Points',
                      color: '#C0B2F0'
                    },
                    ticks: {
                      color: '#C0B2F0'
                    },
                    grid: {
                      color: 'rgba(162, 230, 52, 0.1)'
                    }
                  }
                }
              }
            });
            
            console.log('✅ Chart created successfully');
            
            // Test if chart is actually working
            setTimeout(() => {
              if (chartInstance.current) {
                console.log('🎯 Chart status check:', {
                  data: chartInstance.current.data,
                  datasets: chartInstance.current.data.datasets.length,
                  canvas: chartInstance.current.canvas
                });
              }
            }, 1000);
          }
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load FPL data');
        setLoading(false);
      }
    };

    initChart();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    updateChartLabels();
  }, [showNames, showLogos]);

  const handleLegendClick = (position: number) => {
    if (!chartInstance.current) return;
    
    const chart = chartInstance.current;
    const scatterIndex = (position - 1) * 2;
    const regressionIndex = (position - 1) * 2 + 1;
    
    const scatterDataset = chart.data.datasets[scatterIndex];
    const regressionDataset = chart.data.datasets[regressionIndex];
    
    if (scatterDataset && regressionDataset) {
      const newVisiblePositions = new Set(visiblePositions);
      
      if (scatterDataset.hidden) {
        scatterDataset.hidden = false;
        regressionDataset.hidden = false;
        newVisiblePositions.add(position);
      } else {
        scatterDataset.hidden = true;
        regressionDataset.hidden = true;
        newVisiblePositions.delete(position);
      }
      
      setVisiblePositions(newVisiblePositions);
      chart.update();
      
      // Auto-disable names and logos when toggling positions
      if (showNames || showLogos) {
        setShowNames(false);
        setShowLogos(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lightPurple">VAR checking data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fontRed">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-darkPurple rounded-lg overflow-hidden border border-limeGreenOpacity">
      {/* Header */}
      <div className="bg-deepPurple p-2 text-center border-b border-limeGreenOpacity">
        <h1 className="text-xl font-light text-notWhite mb-2">Player Value Analysis</h1>
        <p className="text-sm opacity-90">Cost vs Total Points</p>
      </div>

      {/* Chart Container */}
      <div className="p-4 relative" style={{ height: '400px' }}>
        <canvas ref={chartRef} />
      </div>



      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 p-4 bg-deepPurple border-t border-limeGreenOpacity">
        {Object.entries(positions).map(([pos, info]) => {
          const position = parseInt(pos);
          const isVisible = visiblePositions.has(position);
          
          return (
            <div
              key={pos}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                isVisible 
                  ? 'bg-deepPink border border-fontRed' 
                  : 'hover:bg-deepPink opacity-50'
              }`}
              onClick={() => handleLegendClick(position)}
            >
              <div
                className={`w-5 h-5 rounded-full transition-all ${
                  isVisible ? 'ring-2 ring-white' : ''
                }`}
                style={{ backgroundColor: info.color }}
              />
              <span className={`text-sm transition-all ${
                isVisible ? 'text-white font-semibold' : 'text-lightPurple'
              }`}>
                {info.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 p-4 bg-deepPurple border-t border-limeGreenOpacity">
        <button
          onClick={() => setShowNames(!showNames)}
          className={`px-4 py-2 rounded border transition-all ${
            showNames
              ? 'bg-deepPink text-white border-fontRed'
              : 'bg-darkPurple text-lightPurple border-limeGreenOpacity hover:bg-deepPink opacity-50'
          }`}
        >
          Show Names
        </button>
        <button
          onClick={() => setShowLogos(!showLogos)}
          className={`px-4 py-2 rounded border transition-all ${
            showLogos
              ? 'bg-deepPink text-white border-fontRed'
              : 'bg-darkPurple text-lightPurple border-limeGreenOpacity hover:bg-deepPink opacity-50'
          }`}
        >
          Show Logos
        </button>
      </div>
    </div>
  );
};

export default FPLScatterplot;
