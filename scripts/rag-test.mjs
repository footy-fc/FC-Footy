#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Parse command line arguments
const args = process.argv.slice(2);
let tournament = 'eng.1';
let eventIdArg = null;
let homeAbbr = null;
let awayAbbr = null;

// Preset matchups for easy testing
const PRESET_MATCHUPS = {
  'arsenal-chelsea': { home: 'ARS', away: 'CHE', tournament: 'eng.1' },
  'man-utd-liverpool': { home: 'MUN', away: 'LIV', tournament: 'eng.1' },
  'man-city-arsenal': { home: 'MCI', away: 'ARS', tournament: 'eng.1' },
  'chelsea-liverpool': { home: 'CHE', away: 'LIV', tournament: 'eng.1' },
  'leeds-everton': { home: 'LEE', away: 'EVE', tournament: 'eng.1' }
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--preset' && i + 1 < args.length) {
    const preset = args[i + 1];
    if (PRESET_MATCHUPS[preset]) {
      const matchup = PRESET_MATCHUPS[preset];
      homeAbbr = matchup.home;
      awayAbbr = matchup.away;
      tournament = matchup.tournament;
      console.log(`🎯 Using preset: ${preset} (${homeAbbr} vs ${awayAbbr})`);
    } else {
      console.log('❌ Unknown preset. Available presets:', Object.keys(PRESET_MATCHUPS).join(', '));
      process.exit(1);
    }
    i++;
  } else if (arg === '--home' && i + 1 < args.length) {
    homeAbbr = args[i + 1];
    i++;
  } else if (arg === '--away' && i + 1 < args.length) {
    awayAbbr = args[i + 1];
    i++;
  } else if (arg === '--eventId' && i + 1 < args.length) {
    eventIdArg = args[i + 1];
    i++;
  } else if (arg === '--tournament' && i + 1 < args.length) {
    tournament = args[i + 1];
    i++;
  } else if (arg === '--help') {
    console.log(`
🧪 RAG CLI Test

Usage: node scripts/rag-test.mjs [options]

Options:
  --preset <name>     Use preset matchup (arsenal-chelsea, man-utd-liverpool, etc.)
  --home <abbr>       Home team abbreviation (e.g., ARS, CHE, LIV)
  --away <abbr>       Away team abbreviation (e.g., ARS, CHE, LIV)
  --eventId <id>      Specific event ID to test
  --tournament <id>   Tournament ID (default: eng.1)
  --help              Show this help

Presets:
  ${Object.keys(PRESET_MATCHUPS).map(p => `  ${p}: ${PRESET_MATCHUPS[p].home} vs ${PRESET_MATCHUPS[p].away}`).join('\n  ')}

Examples:
  node scripts/rag-test.mjs --preset arsenal-chelsea
  node scripts/rag-test.mjs --home ARS --away CHE
  node scripts/rag-test.mjs --eventId 740605
`);
    process.exit(0);
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status} ${res.statusText} for ${url} -> ${text?.slice(0, 200)}`);
  }
  return res.json();
}

function table(rows) {
  if (!rows || rows.length === 0) return '';
  const widths = [];
  rows.forEach((r) => r.forEach((cell, i) => {
    widths[i] = Math.max(widths[i] || 0, String(cell ?? '').length);
  }));
  const fmt = (r) => r.map((c, i) => String(c ?? '').padEnd(widths[i], ' ')).join('  ');
  const out = [];
  out.push(fmt(rows[0]));
  out.push(widths.map((w) => '-'.repeat(w)).join('  '));
  for (let i = 1; i < rows.length; i += 1) out.push(fmt(rows[i]));
  return out.join('\n');
}

async function resolveEventId() {
  if (eventIdArg) return eventIdArg;
  if (!homeAbbr || !awayAbbr) return null;
  const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${tournament}/scoreboard`;
  const data = await fetchJson(scoreboardUrl);
  const events = Array.isArray(data.events) ? data.events : [];
  const match = events.find((e) => {
    const comps = e?.competitions?.[0]?.competitors || [];
    const abbrs = comps.map((c) => c?.team?.abbreviation).filter(Boolean);
    return abbrs.includes(homeAbbr) && abbrs.includes(awayAbbr);
  });
  return match?.id || null;
}

function pickPlayers(players, teams, strategy) {
  const safe = (n) => (Number.isFinite(n) ? n : 0);
  
  // Group players by team
  const playersByTeam = {};
  teams.forEach(team => {
    playersByTeam[team.short_name] = players.filter(p => p.team === team.id);
  });
  
  if (strategy === 'top') {
    // Pick top 2-3 players per team for balanced representation
    const result = [];
    teams.forEach(team => {
      const teamPlayers = playersByTeam[team.short_name] || [];
      const scored = teamPlayers.map((p) => ({
        p,
        form: safe(parseFloat(p.form)),
        ownership: safe(parseFloat(p.selected_by_percent)),
        xg: safe(parseFloat(p.expected_goals)),
        xa: safe(parseFloat(p.expected_assists)),
        // Pre-season fallback: use points_per_game or total_points when form is 0
        fallbackScore: safe(parseFloat(p.points_per_game)) || safe(p.total_points) || 0,
      }));
      
      // Sort by form (or fallback score if form is 0) and ownership
      const sorted = scored.sort((a, b) => {
        const aScore = a.form > 0 ? a.form : a.fallbackScore;
        const bScore = b.form > 0 ? b.form : b.fallbackScore;
        return (bScore + b.ownership / 10) - (aScore + a.ownership / 10);
      });
      
      result.push(...sorted.slice(0, 3).map(s => s.p));
    });
    return result;
  }
  
  // differentials - pick 1-2 per team
  const result = [];
  teams.forEach(team => {
    const teamPlayers = playersByTeam[team.short_name] || [];
    const scored = teamPlayers.map((p) => ({
      p,
      form: safe(parseFloat(p.form)),
      ownership: safe(parseFloat(p.selected_by_percent)),
      xg: safe(parseFloat(p.expected_goals)),
      xa: safe(parseFloat(p.expected_assists)),
      fallbackScore: safe(parseFloat(p.points_per_game)) || safe(p.total_points) || 0,
    }));
    
    // Relaxed differential criteria for pre-season
    const differentials = scored.filter((s) => 
      s.ownership < 5 || (s.form > 0 && s.form > 4) || s.fallbackScore > 50
    );
    
    const sorted = differentials.sort((a, b) => {
      const aScore = a.form > 0 ? a.form : a.fallbackScore;
      const bScore = b.form > 0 ? b.form : b.fallbackScore;
      return (bScore + b.xg + b.xa) - (aScore + a.xg + a.xa);
    });
    
    result.push(...sorted.slice(0, 2).map(s => s.p));
  });
  
  return result;
}

async function main() {
  console.log('🧪 RAG CLI Test');
  console.log('Config:', { BASE_URL, tournament, eventIdArg, homeAbbr, awayAbbr });

  // 1) FPL bootstrap
  process.stdout.write('📦 Fetching FPL bootstrap ... ');
  const bootstrap = await fetchJson(`${BASE_URL}/api/fpl-bootstrap`);
  console.log('ok');
  
  // Display cache information for bootstrap data
  const bootstrapCacheInfo = bootstrap.cache_metadata;
  if (bootstrapCacheInfo) {
    const cacheStatus = bootstrapCacheInfo.cached ? '🟢 CACHED' : '🟡 FRESH';
    const cacheTime = new Date(bootstrapCacheInfo.fetched_at).toLocaleString();
    console.log(`📦 Bootstrap Cache: ${cacheStatus} | Fetched: ${cacheTime}`);
  }
  
  const teams = bootstrap?.teams || [];
  const elements = bootstrap?.elements || [];
  console.log('   Teams:', teams.length, 'Players:', elements.length);

  // 2) Event resolution (optional)
  let eventId = await resolveEventId();
  if (eventId) console.log('🏟️ Using eventId:', eventId);
  else console.log('🏟️ No eventId resolved (pass --eventId or --home/--away). Proceeding with team-only checks.');

  // 3) Build roster for specified teams if provided
  let rosterTeams = [];
  if (homeAbbr || awayAbbr) {
    const wanted = [homeAbbr, awayAbbr].filter(Boolean);
    rosterTeams = teams.filter((t) => wanted.includes(t.short_name));
    const teamIds = new Set(rosterTeams.map((t) => t.id));
    const rosterPlayers = elements.filter((p) => teamIds.has(p.team));

    console.log('👥 Roster summary:');
    rosterTeams.forEach((t) => {
      const count = rosterPlayers.filter((p) => p.team === t.id).length;
      console.log(`   ${t.short_name} ${t.name}: ${count} players`);
    });

    const top = pickPlayers(rosterPlayers, rosterTeams, 'top');
    const diffs = pickPlayers(rosterPlayers, rosterTeams, 'diff');

    const rowsTop = [['Player', 'Team', 'Form', 'Own%', 'xG/xA']].concat(
      top.map((p) => [p.web_name, teams.find((t) => t.id === p.team)?.short_name || '', p.form, p.selected_by_percent, `${p.expected_goals}/${p.expected_assists}`])
    );
    const rowsDiff = [['Player', 'Team', 'Form', 'Own%', 'xG/xA']].concat(
      diffs.map((p) => [p.web_name, teams.find((t) => t.id === p.team)?.short_name || '', p.form, p.selected_by_percent, `${p.expected_goals}/${p.expected_assists}`])
    );

    console.log('\n🎯 TOP PICKS');
    console.log(table(rowsTop));
    console.log('\n🎯 DIFFERENTIALS');
    console.log(table(rowsDiff));

    // Sanity: ensure real names exist
    const hasGeneric = [...top, ...diffs].some((p) => /^Player\s+[A-Z]$/i.test(p.web_name));
    console.log('\nSanity check -> generic names present:', hasGeneric ? 'YES ❌' : 'NO ✅');
  }

  // Test manager picks API
  console.log('\n🎯 Testing Manager Picks API...');
  try {
    // Test with a different manager for variety
    const testEntryIds = [250392, 250393]; // Test multiple managers
    const picksResponse = await fetch(`${BASE_URL}/api/manager-picks?entryId=${testEntryIds[0]}&gameweek=1`);
    if (picksResponse.ok) {
      const picksData = await picksResponse.json();
      console.log('✅ Manager Picks API Status:', picksResponse.status);
      
      // Display cache information
      const cacheInfo = picksData.cache_metadata;
      if (cacheInfo) {
        const cacheStatus = cacheInfo.cached ? '🟢 CACHED' : '🟡 FRESH';
        const cacheTime = new Date(cacheInfo.fetched_at).toLocaleString();
        console.log(`📦 Cache Status: ${cacheStatus} | Fetched: ${cacheTime}`);
      }
      
      console.log('📊 Manager Picks Summary:', {
        entryId: picksData.entry_id,
        gameweek: picksData.gameweek,
        totalPicks: picksData.picks?.length || 0,
        captain: picksData.picks?.find(p => p.is_captain)?.player?.web_name || 'None',
        viceCaptain: picksData.picks?.find(p => p.is_vice_captain)?.player?.web_name || 'None',
        points: picksData.entry_history?.points || 0
      });

      // Display all picks in a table
      if (picksData.picks && picksData.picks.length > 0) {
        console.log('\n📋 ALL MANAGER PICKS:');
        
        // Create table rows for all picks
        const pickRows = [['Pos', 'Player', 'Team', 'Form', 'Own%', 'xG/xA', 'Captain', 'Bench']];
        
        picksData.picks.forEach(pick => {
          const player = pick.player;
          if (player) {
            const isCaptain = pick.is_captain ? 'C' : pick.is_vice_captain ? 'VC' : '';
            const isBench = pick.multiplier === 0 ? 'BENCH' : '';
            
            pickRows.push([
              pick.position.toString(),
              player.web_name,
              player.team?.short_name || 'N/A',
              player.form?.toString() || '0.0',
              `${player.selected_by_percent?.toFixed(1) || '0.0'}%`,
              `${player.expected_goals?.toFixed(2) || '0.00'}/${player.expected_assists?.toFixed(2) || '0.00'}`,
              isCaptain,
              isBench
            ]);
          }
        });
        
        console.log(table(pickRows));
        
        // Show captain and vice-captain details
        const captain = picksData.picks.find(p => p.is_captain)?.player;
        const viceCaptain = picksData.picks.find(p => p.is_vice_captain)?.player;
        
        if (captain) {
          console.log(`\n👑 CAPTAIN: ${captain.web_name} (${captain.team?.short_name}) - Form: ${captain.form}, Own: ${captain.selected_by_percent?.toFixed(1)}%`);
        }
        if (viceCaptain) {
          console.log(`👑 VICE CAPTAIN: ${viceCaptain.web_name} (${viceCaptain.team?.short_name}) - Form: ${viceCaptain.form}, Own: ${viceCaptain.selected_by_percent?.toFixed(1)}%`);
        }
      }
    } else {
      console.log('❌ Manager Picks API failed:', picksResponse.status);
    }

    // Test FID lookup with 4163
    console.log('\n🔍 Testing FID Lookup with 4163...');
    try {
      const fidResponse = await fetch(`${BASE_URL}/api/manager-picks?fid=4163&gameweek=1`);
      if (fidResponse.ok) {
        const fidData = await fidResponse.json();
        console.log('✅ FID Lookup Success:', {
          fid: 4163,
          resolvedEntryId: fidData.entry_id,
          gameweek: fidData.gameweek,
          captain: fidData.picks?.find(p => p.is_captain)?.player?.web_name || 'None'
        });
      } else {
        const errorText = await fidResponse.text();
        console.log('❌ FID Lookup failed:', fidResponse.status, errorText);
      }
    } catch (error) {
      console.log('❌ FID Lookup error:', error.message);
    }
  } catch (error) {
    console.log('❌ Manager Picks API error:', error.message);
  }

  console.log('\n✅ CLI test complete');
}

main().catch((err) => {
  console.error('❌ CLI test failed:', err.message);
  process.exit(1);
});
