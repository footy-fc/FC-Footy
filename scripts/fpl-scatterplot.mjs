#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fetchFPLBootstrapData() {
  try {
    console.log('📊 Fetching FPL bootstrap data...');
    
    // Try to fetch from our API first
    const response = await fetch('https://fc-footy.vercel.app/api/fpl-bootstrap');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ FPL bootstrap data fetched successfully');
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching FPL bootstrap data:', error);
    throw error;
  }
}

function calculateLinearRegression(players) {
  const n = players.length;
  if (n < 2) return [];
  
  // Calculate means
  const sumX = players.reduce((sum, p) => sum + p.x, 0);
  const sumY = players.reduce((sum, p) => sum + p.y, 0);
  const sumXY = players.reduce((sum, p) => sum + (p.x * p.y), 0);
  const sumXX = players.reduce((sum, p) => sum + (p.x * p.x), 0);
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = meanY - slope * meanX;
  
  // Find min and max x values for line endpoints
  const minX = Math.min(...players.map(p => p.x));
  const maxX = Math.max(...players.map(p => p.x));
  
  // Generate line points
  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];
}

function generateScatterplotHTML(players, teams) {
  console.log('📈 Generating scatterplot HTML...');
  
  // Create mapping from FPL team IDs to Premier League logo IDs
  const teamLogoMapping = {
    1: 3,   // Arsenal
    2: 7,   // Aston Villa
    3: 91,  // Bournemouth
    4: 94,  // Brentford
    5: 36,  // Brighton
    6: 90,  // Burnley
    7: 8,   // Chelsea
    8: 31,  // Crystal Palace
    9: 11,  // Everton
    10: 54, // Fulham
    11: 13, // Liverpool
    12: 14, // Luton
    13: 43, // Manchester City
    14: 1,  // Manchester United
    15: 4,  // Newcastle
    16: 17, // Nottingham Forest
    17: 20, // Sheffield United
    18: 6,  // Tottenham
    19: 21, // West Ham
    20: 39  // Wolves
  };
  
  // Filter players with valid data
  const validPlayers = players.filter(player => 
    player.total_points > 0 && 
    player.now_cost > 0 && 
    player.status === 'a' // Only active players
  );
  
  console.log(`📊 Found ${validPlayers.length} valid players for plotting`);
  
  // Prepare data for Chart.js
  const chartData = validPlayers.map(player => {
    const team = teams.find(t => t.id === player.team);
    return {
      x: player.now_cost / 10, // Convert from FPL cost format (e.g., 65 = 6.5m)
      y: player.total_points,
      label: player.web_name,
      team: player.team,
      teamName: team ? team.name : 'Unknown',
      position: player.element_type
    };
  });
  
  // Group by position for different colors
  const positions = {
    1: { name: 'Goalkeepers', color: '#FF6384' },
    2: { name: 'Defenders', color: '#36A2EB' },
    3: { name: 'Midfielders', color: '#FFCE56' },
    4: { name: 'Forwards', color: '#4BC0C0' }
  };
  
  const datasets = Object.entries(positions).map(([posId, pos]) => {
    const posPlayers = chartData.filter(player => player.position === parseInt(posId));
    
    // Calculate linear regression for this position
    const regressionData = calculateLinearRegression(posPlayers);
    
    return [
      // Scatter plot dataset
      {
        label: pos.name,
        data: posPlayers.map(player => ({ 
          x: player.x, 
          y: player.y,
          playerData: player // Store the full player data for reliable tooltip access
        })),
        backgroundColor: pos.color,
        borderColor: pos.color,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      // Regression line dataset
      {
        label: pos.name + ' Trend',
        data: regressionData,
        backgroundColor: pos.color,
        borderColor: pos.color,
        pointRadius: 0,
        pointHoverRadius: 0,
        showLine: true,
        fill: false,
        tension: 0,
        borderWidth: 2,
        borderDash: [5, 5]
      }
    ];
  }).flat();
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FPL Player Value Analysis - Cost vs Total Points</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .chart-container {
            padding: 30px;
            position: relative;
            height: 600px;
            background: rgba(255, 255, 255, 0.05);
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 20px 30px;
            background: rgba(255, 255, 255, 0.1);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #FEA282;
        }
        .stat-label {
            color: rgba(255, 255, 255, 0.8);
            margin-top: 5px;
        }
        .legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 6px;
            transition: all 0.2s ease;
            user-select: none;
        }
        .legend-item:hover {
            background-color: rgba(255,255,255,0.1);
        }
        .legend-item span {
            color: rgba(255, 255, 255, 0.9);
        }
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 50%;
        }
        .controls {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .control-button {
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: rgba(255, 255, 255, 0.9);
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 14px;
            font-weight: 500;
        }
        .control-button:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
        }
        .control-button.active {
            background: #FEA282;
            color: #1a1a2e;
            border-color: #FEA282;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚽ FPL Player Value Analysis</h1>
            <p>Cost vs Total Points Scatterplot - ${new Date().toLocaleDateString()}</p>
            <p style="font-size: 0.9em; margin-top: 10px; opacity: 0.8;">💡 Click on legend items to toggle positions on/off</p>
        </div>
        
        <div class="controls">
            <button class="control-button" id="showNames">👤 Show Player Names</button>
            <button class="control-button" id="showLogos">🏟️ Show Team Logos</button>
        </div>
        
        <div class="chart-container">
            <canvas id="scatterChart"></canvas>
        </div>
        
        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background-color: #FF6384;"></div>
                <span>Goalkeepers</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #36A2EB;"></div>
                <span>Defenders</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #FFCE56;"></div>
                <span>Midfielders</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #4BC0C0;"></div>
                <span>Forwards</span>
            </div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${validPlayers.length}</div>
                <div class="stat-label">Total Players</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">£${(Math.max(...chartData.map(p => p.x))).toFixed(1)}m</div>
                <div class="stat-label">Most Expensive</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.max(...chartData.map(p => p.y))}</div>
                <div class="stat-label">Highest Points</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${(chartData.reduce((sum, p) => sum + p.y, 0) / chartData.length).toFixed(1)}</div>
                <div class="stat-label">Average Points</div>
            </div>
        </div>
    </div>

    <script>
        const ctx = document.getElementById('scatterChart').getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: ${JSON.stringify(datasets)}
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'FPL Player Cost vs Total Points',
                        font: {
                            size: 18,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                // Get the player data directly from the data point
                                const dataPoint = context.dataset.data[context.dataIndex];
                                const player = dataPoint.playerData;
                                
                                if (!player) {
                                    return ['Player data not found'];
                                }
                                
                                const positions = ${JSON.stringify(positions)};
                                const positionName = positions[player.position]?.name || 'Unknown';
                                
                                return [
                                    \`\${player.label}\`,
                                    \`\${player.teamName}\`,
                                    \`£\${player.x}m\`,
                                    \`\${player.y} points\`,
                                    \`\${positionName}\`
                                ];
                            }
                        }
                    },
                    legend: {
                        display: false // Hide default legend since we have custom one
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Player Cost (£m)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return '£' + value + 'm';
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Points',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
        
        // Control button functionality
        let showNames = false;
        let showLogos = false;
        
        document.getElementById('showNames').addEventListener('click', function() {
            showNames = !showNames;
            this.classList.toggle('active');
            updateChartLabels();
        });
        
        document.getElementById('showLogos').addEventListener('click', function() {
            showLogos = !showLogos;
            this.classList.toggle('active');
            updateChartLabels();
        });
        
        function updateChartLabels() {
            // Update scatter datasets to show/hide labels
            chart.data.datasets.forEach((dataset, index) => {
                if (index % 2 === 0) { // Only scatter datasets (not regression lines)
                    const dataPoint = dataset.data[0];
                    if (dataPoint && dataPoint.playerData) {
                        dataset.pointRadius = showNames || showLogos ? 6 : 4;
                        
                        // Add or remove labels
                        if (showNames) {
                            dataset.pointBackgroundColor = dataset.backgroundColor;
                            dataset.pointBorderColor = dataset.borderColor;
                            dataset.pointBorderWidth = 2;
                        } else {
                            dataset.pointBackgroundColor = dataset.backgroundColor;
                            dataset.pointBorderColor = dataset.borderColor;
                            dataset.pointBorderWidth = 0;
                        }
                    }
                }
            });
            
            chart.update('none'); // Update without animation for better performance
            
            // Add text labels and/or logos if enabled
            if (showNames || showLogos) {
                addTextLabels();
            } else {
                removeTextLabels();
            }
        }
        
        function addTextLabels() {
            // Remove existing labels first
            removeTextLabels();
            
            // Get visible position indices (0=GK, 1=DEF, 2=MID, 3=FWD)
            const visiblePositions = [];
            for (let i = 0; i < 4; i++) {
                const scatterIndex = i * 2;
                const scatterDataset = chart.data.datasets[scatterIndex];
                if (scatterDataset && !scatterDataset.hidden) {
                    visiblePositions.push(i);
                }
            }
            
            chart.data.datasets.forEach((dataset, index) => {
                // Only process scatter datasets (even indices) that are visible
                if (index % 2 === 0 && !dataset.hidden) {
                    dataset.data.forEach((point, pointIndex) => {
                        const player = point.playerData;
                        if (player) {
                            // Add player name if enabled
                            if (showNames) {
                                const textElement = document.createElement('div');
                                textElement.className = 'player-label';
                                textElement.textContent = player.label;
                                textElement.style.cssText = \`
                                    position: absolute;
                                    font-size: 10px;
                                    color: white;
                                    background: rgba(0,0,0,0.7);
                                    padding: 2px 4px;
                                    border-radius: 3px;
                                    pointer-events: none;
                                    z-index: 1;
                                    white-space: nowrap;
                                \`;
                                
                                // Position the label
                                const canvasRect = ctx.canvas.getBoundingClientRect();
                                const chartArea = chart.chartArea;
                                const x = chartArea.left + (point.x - chart.scales.x.min) / (chart.scales.x.max - chart.scales.x.min) * chartArea.width;
                                const y = chartArea.top + (chart.scales.y.max - point.y) / (chart.scales.y.max - chart.scales.y.min) * chartArea.height;
                                
                                textElement.style.left = (x + 8) + 'px';
                                textElement.style.top = (y + 8) + 'px';
                                
                                document.querySelector('.chart-container').appendChild(textElement);
                            }
                            
                            // Add team logo if enabled
                            if (showLogos) {
                                const logoElement = document.createElement('img');
                                logoElement.className = 'team-logo';
                                const logoId = ${JSON.stringify(teamLogoMapping)}[player.team] || player.team;
                                logoElement.src = \`https://resources.premierleague.com/premierleague/badges/t\${logoId}.png\`;
                                logoElement.style.cssText = \`
                                    position: absolute;
                                    width: 16px;
                                    height: 16px;
                                    pointer-events: none;
                                    z-index: 2;
                                    border-radius: 2px;
                                \`;
                                
                                // Position the logo
                                const canvasRect = ctx.canvas.getBoundingClientRect();
                                const chartArea = chart.chartArea;
                                const x = chartArea.left + (point.x - chart.scales.x.min) / (chart.scales.x.max - chart.scales.x.min) * chartArea.width;
                                const y = chartArea.top + (chart.scales.y.max - point.y) / (chart.scales.y.max - chart.scales.y.min) * chartArea.height;
                                
                                logoElement.style.left = (x - 8) + 'px';
                                logoElement.style.top = (y - 8) + 'px';
                                
                                // Handle logo load error with fallback
                                logoElement.onerror = function() {
                                    this.style.display = 'none';
                                };
                                
                                document.querySelector('.chart-container').appendChild(logoElement);
                            }
                        }
                    });
                }
            });
        }
        
        function removeTextLabels() {
            const labels = document.querySelectorAll('.player-label');
            const logos = document.querySelectorAll('.team-logo');
            labels.forEach(label => label.remove());
            logos.forEach(logo => logo.remove());
        }
        
        // Custom interactive legend
        const legendItems = document.querySelectorAll('.legend-item');
        const datasets = ${JSON.stringify(datasets)};
        
        legendItems.forEach((item, index) => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() {
                // Each position has 2 datasets: scatter plot (even index) and regression line (odd index)
                const scatterIndex = index * 2;
                const regressionIndex = index * 2 + 1;
                
                const scatterDataset = chart.data.datasets[scatterIndex];
                const regressionDataset = chart.data.datasets[regressionIndex];
                
                // Toggle visibility for both scatter and regression
                if (scatterDataset.hidden) {
                    scatterDataset.hidden = false;
                    regressionDataset.hidden = false;
                    item.style.opacity = '1';
                } else {
                    scatterDataset.hidden = true;
                    regressionDataset.hidden = true;
                    item.style.opacity = '0.3';
                }
                
                chart.update();
                
                // Update stats based on visible datasets
                updateStats();
                
                // Auto-disable names and logos when toggling positions to avoid confusion
                if (showNames || showLogos) {
                    showNames = false;
                    showLogos = false;
                    document.getElementById('showNames').classList.remove('active');
                    document.getElementById('showLogos').classList.remove('active');
                    removeTextLabels();
                }
            });
        });
        
        function updateStats() {
            const visibleData = [];
            chart.data.datasets.forEach((dataset, index) => {
                // Only count scatter datasets (even indices), skip regression lines (odd indices)
                if (!dataset.hidden && index % 2 === 0) {
                    visibleData.push(...dataset.data);
                }
            });
            
            if (visibleData.length > 0) {
                const maxCost = Math.max(...visibleData.map(d => d.x));
                const maxPoints = Math.max(...visibleData.map(d => d.y));
                const avgPoints = (visibleData.reduce((sum, d) => sum + d.y, 0) / visibleData.length).toFixed(1);
                
                document.querySelector('.stat-number:nth-child(1)').textContent = visibleData.length;
                document.querySelector('.stat-number:nth-child(2)').textContent = '£' + maxCost.toFixed(1) + 'm';
                document.querySelector('.stat-number:nth-child(3)').textContent = maxPoints;
                document.querySelector('.stat-number:nth-child(4)').textContent = avgPoints;
            }
        }
        
        // Add hover effects to legend
        legendItems.forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
                this.style.transition = 'transform 0.2s ease';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        });
    </script>
</body>
</html>`;

  return html;
}

function openInBrowser(filePath) {
  const platform = process.platform;
  
  try {
    switch (platform) {
      case 'darwin':
        execSync(`open "${filePath}"`);
        break;
      case 'win32':
        execSync(`start "${filePath}"`);
        break;
      default:
        execSync(`xdg-open "${filePath}"`);
        break;
    }
    console.log('✅ Scatterplot opened in browser!');
  } catch (error) {
    console.log('❌ Failed to open browser automatically');
    console.log(`🔗 Please open this file manually: ${filePath}`);
  }
}

async function main() {
  try {
    console.log('🎯 FPL Player Value Analysis - Scatterplot Generator');
    console.log('='.repeat(60));
    
    // Fetch FPL bootstrap data
    const bootstrapData = await fetchFPLBootstrapData();
    
    if (!bootstrapData.elements || !Array.isArray(bootstrapData.elements)) {
      throw new Error('Invalid bootstrap data structure');
    }
    
    console.log(`📊 Found ${bootstrapData.elements.length} players in bootstrap data`);
    console.log(`🏟️ Found ${bootstrapData.teams?.length || 0} teams in bootstrap data`);
    
    // Generate scatterplot HTML
    const html = generateScatterplotHTML(bootstrapData.elements, bootstrapData.teams || []);
    
    // Save to file
    const outputPath = join(__dirname, '../public/fpl-scatterplot.html');
    writeFileSync(outputPath, html);
    
    console.log(`📄 Scatterplot saved to: ${outputPath}`);
    console.log('\n📈 Chart Features:');
    console.log('• Players grouped by position (GK, DEF, MID, FWD)');
    console.log('• Hover tooltips with player details');
    console.log('• Cost vs Total Points correlation');
    console.log('• Interactive legend and statistics');
    
    // Open in browser
    console.log('\n🚀 Opening scatterplot in browser...');
    openInBrowser(outputPath);
    
  } catch (error) {
    console.error('❌ Error generating scatterplot:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
