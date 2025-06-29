// Debug script to test search functionality
// Tests the search logic and team data

import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load environment variables
config();

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Simulate the search logic from TeamsTab
function filterTeams(teams, searchTerm) {
  return teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.abbreviation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.country.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

async function testSearchDebug() {
  console.log('🔍 Testing search functionality...\n');

  try {
    // Test 1: Get teams from API
    console.log('1️⃣ Testing API response...');
    const response = await fetch('http://localhost:3000/api/teams', {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   📊 API returned ${data.teams.length} teams`);
      
      if (data.teams.length === 0) {
        console.log('   ❌ No teams returned from API - this is the problem!');
        return;
      }
      
      // Show first few teams
      console.log('   📋 Sample teams:');
      data.teams.slice(0, 5).forEach(team => {
        console.log(`      - ${team.name} (${team.abbreviation}) - ${team.country}`);
      });
      
      // Test 2: Test search functionality
      console.log('\n2️⃣ Testing search functionality...');
      
      const searchTests = [
        { term: 'liverpool', description: 'Search for "liverpool"' },
        { term: 'liv', description: 'Search for "liv" (abbreviation)' },
        { term: 'eng', description: 'Search for "eng" (country)' },
        { term: 'arsenal', description: 'Search for "arsenal"' },
        { term: 'ars', description: 'Search for "ars" (abbreviation)' },
        { term: 'test', description: 'Search for "test"' },
        { term: '', description: 'Empty search (should show all teams)' }
      ];
      
      for (const test of searchTests) {
        const filtered = filterTeams(data.teams, test.term);
        console.log(`   🔍 ${test.description}:`);
        console.log(`      📊 Found ${filtered.length} teams`);
        
        if (filtered.length > 0) {
          console.log(`      📋 First 3 results:`);
          filtered.slice(0, 3).forEach(team => {
            console.log(`         - ${team.name} (${team.abbreviation}) - ${team.country}`);
          });
        } else {
          console.log(`      ❌ No results found`);
        }
        console.log('');
      }
      
      // Test 3: Check for specific team data issues
      console.log('3️⃣ Checking team data structure...');
      const sampleTeam = data.teams[0];
      if (sampleTeam) {
        console.log(`   📋 Sample team structure:`);
        console.log(`      - name: "${sampleTeam.name}" (type: ${typeof sampleTeam.name})`);
        console.log(`      - shortName: "${sampleTeam.shortName}" (type: ${typeof sampleTeam.shortName})`);
        console.log(`      - abbreviation: "${sampleTeam.abbreviation}" (type: ${typeof sampleTeam.abbreviation})`);
        console.log(`      - country: "${sampleTeam.country}" (type: ${typeof sampleTeam.country})`);
        
        // Test search on this specific team
        console.log(`   🔍 Testing search on "${sampleTeam.name}":`);
        const nameSearch = filterTeams([sampleTeam], sampleTeam.name);
        const abbrSearch = filterTeams([sampleTeam], sampleTeam.abbreviation);
        const countrySearch = filterTeams([sampleTeam], sampleTeam.country);
        
        console.log(`      - Name search: ${nameSearch.length > 0 ? '✅' : '❌'}`);
        console.log(`      - Abbreviation search: ${abbrSearch.length > 0 ? '✅' : '❌'}`);
        console.log(`      - Country search: ${countrySearch.length > 0 ? '✅' : '❌'}`);
      }
      
    } else {
      console.log(`   ❌ API returned status: ${response.status}`);
    }
    
    console.log('\n✅ Search debug test completed!');

  } catch (error) {
    console.error('❌ Search debug test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSearchDebug(); 