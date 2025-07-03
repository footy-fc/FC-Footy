// Quick test to check for teams with "man" in their data
import { config } from 'dotenv';

// Load environment variables
config();

async function testManSearch() {
  console.log('🔍 Testing search for "man"...\n');

  try {
    const response = await fetch('http://localhost:3000/api/teams', {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Total teams: ${data.teams.length}`);
      
      // Find teams with "man" in any field
      const teamsWithMan = data.teams.filter(team =>
        team.name.toLowerCase().includes('man') ||
        team.shortName.toLowerCase().includes('man') ||
        team.abbreviation.toLowerCase().includes('man') ||
        team.country.toLowerCase().includes('man')
      );
      
      console.log(`🔍 Teams with "man": ${teamsWithMan.length}`);
      
      if (teamsWithMan.length > 0) {
        console.log('📋 Teams found:');
        teamsWithMan.forEach(team => {
          console.log(`   - ${team.name} (${team.abbreviation}) - ${team.country}`);
          console.log(`     name: "${team.name}"`);
          console.log(`     shortName: "${team.shortName}"`);
          console.log(`     abbreviation: "${team.abbreviation}"`);
          console.log(`     country: "${team.country}"`);
          console.log('');
        });
      } else {
        console.log('❌ No teams found with "man" in any field');
        
        // Show some sample teams to see what we have
        console.log('📋 Sample teams:');
        data.teams.slice(0, 10).forEach(team => {
          console.log(`   - ${team.name} (${team.abbreviation}) - ${team.country}`);
        });
      }
      
    } else {
      console.log(`❌ API returned status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testManSearch(); 