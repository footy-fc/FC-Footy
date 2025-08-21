#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load fantasy managers lookup
const fantasyManagersLookupPath = join(__dirname, '../src/data/fantasy-managers-lookup.json');
const fantasyManagersLookup = JSON.parse(readFileSync(fantasyManagersLookupPath, 'utf8'));

// Helper function to get team name from entry_id
function getTeamName(entryId) {
  const lookup = fantasyManagersLookup.find(entry => entry.entry_id === entryId);
  return lookup ? lookup.team_name : 'Unknown Team';
}

// Sample data for testing - using real entry_ids from fantasy managers lookup
const testData = {
  top5: [
    { username: "je11yf15h", entry: 192153, total: 91, team_name: getTeamName(192153) },
    { username: "femmie", entry: 215181, total: 89, team_name: getTeamName(215181) },
    { username: "ghost", entry: 200716, total: 87, team_name: getTeamName(200716) },
    { username: "kimken", entry: 204596, total: 85, team_name: getTeamName(204596) },
    { username: "henry", entry: 179856, total: 83, team_name: getTeamName(179856) }
  ],
  bottom5: [
    { username: "milo", entry: 23272, total: 26, team_name: getTeamName(23272) },
    { username: "vyenepaul", entry: 47421, total: 29, team_name: getTeamName(47421) },
    { username: "zipar", entry: 55728, total: 31, team_name: getTeamName(55728) },
    { username: "kazani", entry: 56917, total: 33, team_name: getTeamName(56917) },
    { username: "supertaster", entry: 100599, total: 35, team_name: getTeamName(100599) }
  ],
  gameWeek: 1
};

function buildTemplateUrl() {
  const params = new URLSearchParams({
    top5: JSON.stringify(testData.top5),
    bottom5: JSON.stringify(testData.bottom5),
    gameWeek: testData.gameWeek.toString()
  });
  
  return `http://localhost:3000/templates/gameweek-table-toppers?${params.toString()}`;
}

function openInBrowser(url) {
  const platform = process.platform;
  
  try {
    switch (platform) {
      case 'darwin':
        execSync(`open "${url}"`);
        break;
      case 'win32':
        execSync(`start "${url}"`);
        break;
      default:
        execSync(`xdg-open "${url}"`);
        break;
    }
    console.log('✅ Template opened in browser!');
  } catch (error) {
    console.log('❌ Failed to open browser automatically');
    console.log(`🔗 Please open this URL manually: ${url}`);
  }
}

function printTestData() {
  console.log('\n📊 Test Data:');
  console.log('─'.repeat(50));
  console.log(`Game Week: ${testData.gameWeek}`);
  console.log('\n🏆 Top 5:');
  testData.top5.forEach((manager, index) => {
    console.log(`  ${index + 1}. @${manager.username} - ${manager.total}pts (${manager.team_name})`);
  });
  console.log('\n😅 Bottom 5:');
  testData.bottom5.forEach((manager, index) => {
    console.log(`  ${testData.bottom5.length - index}. @${manager.username} - ${manager.total}pts (${manager.team_name})`);
  });
  console.log('─'.repeat(50));
}

function main() {
  console.log('🎨 Template Design Tester');
  console.log('========================\n');
  
  printTestData();
  
  const templateUrl = buildTemplateUrl();
  console.log(`\n🔗 Template URL: ${templateUrl}`);
  
  console.log('\n🚀 Opening template in browser...');
  openInBrowser(templateUrl);
  
  console.log('\n💡 Design Tips:');
  console.log('• The template will load with profile pictures from Merv Hub');
  console.log('• You can inspect the page and modify the CSS in real-time');
  console.log('• Changes to the template file will require a page refresh');
  console.log('• Use browser dev tools to test different screen sizes');
  
  console.log('\n🔄 To test with different data, modify the testData object in this script');
  console.log('📝 To iterate on design, edit: src/app/templates/gameweek-table-toppers/page.tsx');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
