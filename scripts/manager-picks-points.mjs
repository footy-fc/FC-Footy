#!/usr/bin/env node

// Compare a manager's player points across two gameweeks
// Usage:
//   node scripts/manager-picks-points.mjs --fid 4163 --gw1 1 --gw2 2
//   NEXT_PUBLIC_BASE_URL="http://localhost:3000" node scripts/manager-picks-points.mjs --fid 4163 --gw1 1 --gw2 2

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://fc-footy.vercel.app';

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { fid: 4163, gw1: 1, gw2: 2, csv: false, baseUrl: DEFAULT_BASE_URL };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--fid' && args[i + 1]) config.fid = Number(args[++i]);
    else if (a === '--gw1' && args[i + 1]) config.gw1 = Number(args[++i]);
    else if (a === '--gw2' && args[i + 1]) config.gw2 = Number(args[++i]);
    else if (a === '--csv') config.csv = true;
    else if ((a === '--base' || a === '--base-url') && args[i + 1]) config.baseUrl = args[++i];
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!Number.isFinite(config.fid) || config.fid <= 0) {
    console.error('fid must be a positive number');
    process.exit(1);
  }
  for (const k of ['gw1', 'gw2']) {
    if (!Number.isFinite(config[k]) || config[k] < 1 || config[k] > 38) {
      console.error(`${k} must be between 1 and 38`);
      process.exit(1);
    }
  }
  return config;
}

function printHelp() {
  console.log(`\nCompare manager picks points between two gameweeks\n\nUsage:\n  node scripts/manager-picks-points.mjs --fid 4163 --gw1 1 --gw2 2 [--csv] [--base <url>]\n\nOptions:\n  --fid <num>      Manager FID (not entryId) [default: 4163]\n  --gw1 <1-38>     First gameweek [default: 1]\n  --gw2 <1-38>     Second gameweek [default: 2]\n  --csv            Output CSV instead of a table\n  --base <url>     Base app URL for API (defaults to NEXT_PUBLIC_BASE_URL or ${DEFAULT_BASE_URL})\n`);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'fc-footy-cli/1.0' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} for ${url} ${text ? '- ' + text.slice(0, 200) : ''}`);
  }
  return res.json();
}

async function fetchManagerPicksByGw(baseUrl, fid, gw) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/manager-picks?fid=${encodeURIComponent(fid)}&gameweek=${encodeURIComponent(gw)}`;
  return fetchJson(url);
}

async function fetchLivePointsForGw(gw) {
  // FPL official live endpoint for per-element points in a gameweek
  const url = `https://fantasy.premierleague.com/api/event/${gw}/live/`;
  const data = await fetchJson(url);
  const map = new Map();
  if (Array.isArray(data.elements)) {
    for (const e of data.elements) {
      const id = e.id;
      const pts = e?.stats?.total_points ?? 0;
      map.set(id, Number(pts) || 0);
    }
  }
  return map;
}

function padRight(str, len) {
  const s = String(str);
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function toCsvRow(values) {
  return values.map((v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(',');
}

function printTable(rows) {
  const headers = ['Player', 'Team', 'Pos', 'Status1', 'Status2', 'GW1', 'GW2', 'Total'];
  const widths = [24, 8, 4, 8, 8, 6, 6, 7];
  const sep = '-'.repeat(widths.reduce((a, b) => a + b + 3, -3));
  console.log(headers.map((h, i) => padRight(h, widths[i])).join(' | '));
  console.log(sep);
  for (const r of rows) {
    const vals = [
      padRight(r.player, widths[0]),
      padRight(r.team, widths[1]),
      padRight(r.pos, widths[2]),
      padRight(r.status1, widths[3]),
      padRight(r.status2, widths[4]),
      padRight(r.gw1.toString(), widths[5]),
      padRight(r.gw2.toString(), widths[6]),
      padRight(r.total.toString(), widths[7]),
    ];
    console.log(vals.join(' | '));
  }
}

function printCsv(rows) {
  const headers = ['Player', 'Team', 'Pos', 'Status1', 'Status2', 'GW1', 'GW2', 'Total'];
  console.log(toCsvRow(headers));
  for (const r of rows) {
    console.log(toCsvRow([r.player, r.team, r.pos, r.status1, r.status2, r.gw1, r.gw2, r.total]));
  }
}

async function main() {
  const { fid, gw1, gw2, csv, baseUrl } = parseArgs();

  console.log(`Base: ${baseUrl} | FID: ${fid} | GW1: ${gw1} | GW2: ${gw2}`);

  // Fetch picks and live points for both gameweeks in parallel
  const [p1, p2, live1, live2] = await Promise.all([
    fetchManagerPicksByGw(baseUrl, fid, gw1),
    fetchManagerPicksByGw(baseUrl, fid, gw2),
    fetchLivePointsForGw(gw1),
    fetchLivePointsForGw(gw2),
  ]);

  // Combine by player element ID
  const byElement = new Map();

  const posName = (et) => ({1:'GKP',2:'DEF',3:'MID',4:'FWD'}[Number(et)] || '');

  function addFromPicks(picksData, livePts, whichGw) {
    if (!picksData || !Array.isArray(picksData.picks)) return;
    for (const pick of picksData.picks) {
      const elementId = pick.element;
      const multiplier = Number(pick.multiplier) || 0;
      const live = Number(livePts.get(elementId) || 0);
      const applied = Math.max(0, Math.round(live * multiplier));
      const playerName = pick?.player?.web_name || pick?.player?.name || `#${elementId}`;
      const teamName = pick?.player?.team?.short_name || pick?.player?.team?.name || '';
      const existing = byElement.get(elementId) || { 
        player: playerName, 
        team: teamName, 
        pos: posName(pick?.player?.element_type || pick?.element_type),
        cap1: false,
        vice1: false,
        bench1: false,
        cap2: false,
        vice2: false,
        bench2: false,
        gw1: 0, 
        gw2: 0 
      };
      // Preserve the most descriptive names if available later
      if (!existing.player || existing.player.startsWith('#')) existing.player = playerName;
      if (!existing.team) existing.team = teamName;
      if (!existing.pos) existing.pos = posName(pick?.player?.element_type || pick?.element_type);
      // Track status flags per GW
      if (whichGw === 'gw1') {
        if (pick?.is_captain) existing.cap1 = true;
        if (pick?.is_vice_captain) existing.vice1 = true;
        if (multiplier === 0) existing.bench1 = true;
      } else if (whichGw === 'gw2') {
        if (pick?.is_captain) existing.cap2 = true;
        if (pick?.is_vice_captain) existing.vice2 = true;
        if (multiplier === 0) existing.bench2 = true;
      }
      existing[whichGw] += applied;
      byElement.set(elementId, existing);
    }
  }

  addFromPicks(p1, live1, 'gw1');
  addFromPicks(p2, live2, 'gw2');

  // Build rows and sort by total desc
  const rows = Array.from(byElement.values()).map((r) => {
    const status1 = [r.cap1 ? 'c' : null, r.vice1 ? 'vc' : null, r.bench1 ? 'b' : null].filter(Boolean).join(' ');
    const status2 = [r.cap2 ? 'c' : null, r.vice2 ? 'vc' : null, r.bench2 ? 'b' : null].filter(Boolean).join(' ');
    return {
      player: r.player,
      team: r.team,
      pos: r.pos || '',
      status1,
      status2,
      gw1: r.gw1 || 0,
      gw2: r.gw2 || 0,
      total: (r.gw1 || 0) + (r.gw2 || 0),
    };
  })
  .sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));

  if (csv) {
    printCsv(rows);
  } else {
    printTable(rows);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
