#!/usr/bin/env node

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Test scenarios for Peter Drury commentary
const TEST_SCENARIOS = [
  {
    name: "Messi World Cup Final Goal",
    eventId: "wc22-arg-fra-01",
    homeTeam: "Argentina",
    awayTeam: "France",
    competition: "FIFA World Cup 2022",
    eventType: "goal",
    player: "Lionel Messi",
    minute: 23,
    score: "1-0",
    context: "Messi opens the scoring in the World Cup final"
  },
  {
    name: "Roma Comeback vs Barcelona",
    eventId: "ucl18-roma-barca-03",
    homeTeam: "AS Roma",
    awayTeam: "FC Barcelona",
    competition: "UEFA Champions League",
    eventType: "goal",
    player: "Kostas Manolas",
    minute: 82,
    score: "3-0",
    context: "Roma complete historic comeback to advance on away goals"
  },
  {
    name: "Morocco Historic Win",
    eventId: "wc22-morocco-bel-01",
    homeTeam: "Morocco",
    awayTeam: "Belgium",
    competition: "FIFA World Cup 2022",
    eventType: "goal",
    player: "Zakaria Aboukhlal",
    minute: 73,
    score: "2-0",
    context: "Morocco secure historic group stage victory"
  },
  {
    name: "Cameroon vs Brazil Upset",
    eventId: "wc22-cameroon-brazil-01",
    homeTeam: "Cameroon",
    awayTeam: "Brazil",
    competition: "FIFA World Cup 2022",
    eventType: "goal",
    player: "Vincent Aboubakar",
    minute: 92,
    score: "1-0",
    context: "Stoppage time winner against Brazil"
  },
  {
    name: "Senegal Captain's Goal",
    eventId: "wc22-senegal-ecuador-01",
    homeTeam: "Senegal",
    awayTeam: "Ecuador",
    competition: "FIFA World Cup 2022",
    eventType: "goal",
    player: "Kalidou Koulibaly",
    minute: 70,
    score: "2-1",
    context: "Captain's volley sends Senegal through to knockout stage"
  },
  {
    name: "South Africa World Cup Opener",
    eventId: "wc10-southafrica-mexico-01",
    homeTeam: "South Africa",
    awayTeam: "Mexico",
    competition: "FIFA World Cup 2010",
    eventType: "goal",
    player: "Siphiwe Tshabalala",
    minute: 55,
    score: "1-0",
    context: "Tournament's opening goal, first African World Cup"
  },
  {
    name: "Final Whistle - Argentina Champions",
    eventId: "wc22-arg-fra-final",
    homeTeam: "Argentina",
    awayTeam: "France",
    competition: "FIFA World Cup 2022",
    eventType: "final_whistle",
    minute: 120,
    score: "3-3 (4-2 pens)",
    context: "Argentina win World Cup after dramatic penalty shootout"
  },
  {
    name: "Red Card Drama",
    eventId: "ucl18-roma-barca-red",
    homeTeam: "AS Roma",
    awayTeam: "FC Barcelona",
    competition: "UEFA Champions League",
    eventType: "red_card",
    player: "Daniele De Rossi",
    minute: 67,
    score: "2-0",
    context: "Roma captain sent off in crucial Champions League match"
  }
];

async function testPeterDruryCommentary() {
  console.log('🎤 Testing Peter Drury Commentary System\n');
  console.log('=' .repeat(60));

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📺 ${scenario.name}`);
    console.log('-'.repeat(40));
    
    try {
      // Test via GET request
      const params = new URLSearchParams({
        eventId: scenario.eventId,
        homeTeam: scenario.homeTeam,
        awayTeam: scenario.awayTeam,
        competition: scenario.competition,
        eventType: scenario.eventType,
        ...(scenario.player && { player: scenario.player }),
        ...(scenario.minute && { minute: scenario.minute.toString() }),
        ...(scenario.score && { score: scenario.score }),
        ...(scenario.context && { context: scenario.context })
      });

      const response = await fetch(`${BASE_URL}/api/peter-drury-commentary?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`🏟️  Match: ${scenario.homeTeam} vs ${scenario.awayTeam}`);
        console.log(`⚽ Event: ${scenario.eventType.toUpperCase()}`);
        if (scenario.player) console.log(`👤 Player: ${scenario.player}`);
        if (scenario.minute) console.log(`⏰ Minute: ${scenario.minute}`);
        if (scenario.score) console.log(`📊 Score: ${scenario.score}`);
        if (scenario.context) console.log(`📝 Context: ${scenario.context}`);
        
        console.log('\n🎭 PETER DRURY COMMENTARY:');
        console.log(`"${data.commentary}"`);
        
        console.log(`\n✅ Success | Generated at: ${data.timestamp}`);
      } else {
        const errorData = await response.json();
        console.log(`❌ Error: ${response.status} - ${errorData.error}`);
        if (errorData.details) console.log(`Details: ${errorData.details}`);
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎤 Peter Drury Commentary Test Complete!');
}

// Test specific scenario if provided
async function testSpecificScenario(scenarioName) {
  const scenario = TEST_SCENARIOS.find(s => s.name.toLowerCase().includes(scenarioName.toLowerCase()));
  
  if (!scenario) {
    console.log('❌ Scenario not found. Available scenarios:');
    TEST_SCENARIOS.forEach(s => console.log(`  - ${s.name}`));
    return;
  }

  console.log(`🎤 Testing Specific Scenario: ${scenario.name}\n`);
  
  try {
    const params = new URLSearchParams({
      eventId: scenario.eventId,
      homeTeam: scenario.homeTeam,
      awayTeam: scenario.awayTeam,
      competition: scenario.competition,
      eventType: scenario.eventType,
      ...(scenario.player && { player: scenario.player }),
      ...(scenario.minute && { minute: scenario.minute.toString() }),
      ...(scenario.score && { score: scenario.score }),
      ...(scenario.context && { context: scenario.context })
    });

    const response = await fetch(`${BASE_URL}/api/peter-drury-commentary?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('📋 SCENARIO DETAILS:');
      console.log(`🏟️  Match: ${scenario.homeTeam} vs ${scenario.awayTeam}`);
      console.log(`⚽ Event: ${scenario.eventType.toUpperCase()}`);
      if (scenario.player) console.log(`👤 Player: ${scenario.player}`);
      if (scenario.minute) console.log(`⏰ Minute: ${scenario.minute}`);
      if (scenario.score) console.log(`📊 Score: ${scenario.score}`);
      if (scenario.context) console.log(`📝 Context: ${scenario.context}`);
      
      console.log('\n🎭 PETER DRURY COMMENTARY:');
      console.log(`"${data.commentary}"`);
      
      console.log(`\n✅ Success | Generated at: ${data.timestamp}`);
    } else {
      const errorData = await response.json();
      console.log(`❌ Error: ${response.status} - ${errorData.error}`);
      if (errorData.details) console.log(`Details: ${errorData.details}`);
    }
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const scenarioArg = args.find(arg => arg.startsWith('--scenario='));

if (scenarioArg) {
  const scenarioName = scenarioArg.split('=')[1];
  testSpecificScenario(scenarioName);
} else if (args.includes('--help')) {
  console.log(`
🎤 Peter Drury Commentary Test Script

Usage: node scripts/peter-drury-test.mjs [options]

Options:
  --scenario=<name>  Test a specific scenario (partial match)
  --help             Show this help

Available Scenarios:
${TEST_SCENARIOS.map(s => `  - ${s.name}`).join('\n')}

Examples:
  node scripts/peter-drury-test.mjs
  node scripts/peter-drury-test.mjs --scenario=messi
  node scripts/peter-drury-test.mjs --scenario=roma
`);
} else {
  testPeterDruryCommentary();
}
