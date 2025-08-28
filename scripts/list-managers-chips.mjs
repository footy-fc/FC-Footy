#!/usr/bin/env node

// List FEPL managers and which chips they still have left.
// Data source: FPL API entry history chips list per manager.
//
// Usage:
//   node scripts/list-managers-chips.mjs [--csv] [--concurrency 8]

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const lookupPath = join(__dirname, '../src/data/fantasy-managers-lookup.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = { csv: false, concurrency: 8 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--csv') cfg.csv = true;
    else if (a === '--concurrency' && args[i + 1]) cfg.concurrency = Math.max(1, Number(args[++i]) || 8);
    else if (a === '--help' || a === '-h') {
      console.log('\nList FEPL managers and chips left');
      console.log('Usage: node scripts/list-managers-chips.mjs [--csv] [--concurrency 8]\n');
      process.exit(0);
    }
  }
  return cfg;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'fc-footy-cli/1.0' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} for ${url} ${text ? '- ' + text.slice(0, 120) : ''}`);
  }
  return res.json();
}

async function getChipsUsed(entryId) {
  // FPL: history includes chips used array: [{name: 'bboost'|'3xc'|'freehit'|'wildcard', event: number}]
  const url = `https://fantasy.premierleague.com/api/entry/${entryId}/history/`;
  try {
    const data = await fetchJson(url);
    const chips = Array.isArray(data?.chips) ? data.chips : [];
    const used = { bboost: 0, '3xc': 0, freehit: 0, wildcard: 0 };
    for (const c of chips) {
      const name = c?.name;
      if (name && name in used) used[name]++;
    }
    return used;
  } catch (err) {
    return { error: err?.message || String(err) };
  }
}

function chipsLeftFromUsed(used) {
  const totalAllowed = { bboost: 1, '3xc': 1, freehit: 1, wildcard: 2 };
  const left = {};
  for (const k of Object.keys(totalAllowed)) {
    left[k] = Math.max(0, totalAllowed[k] - (Number(used?.[k]) || 0));
  }
  return left;
}

function formatStatus(left) {
  // Return compact list like: BB TC FH WC WC (repeat WC by count)
  const tokens = [];
  if (left.bboost > 0) tokens.push('BB');
  if (left['3xc'] > 0) tokens.push('TC');
  if (left.freehit > 0) tokens.push('FH');
  if (left.wildcard > 0) tokens.push(...Array.from({ length: left.wildcard }, () => 'WC'));
  return tokens.join(' ');
}

function padRight(str, len) {
  const s = String(str ?? '');
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
  const headers = ['Team', 'FID', 'Entry', 'BB', 'TC', 'FH', 'WC', 'Left'];
  const widths = [26, 8, 8, 4, 4, 4, 4, 20];
  const sep = '-'.repeat(widths.reduce((a, b) => a + b + 3, -3));
  console.log(headers.map((h, i) => padRight(h, widths[i])).join(' | '));
  console.log(sep);
  for (const r of rows) {
    const vals = [
      padRight(r.team, widths[0]),
      padRight(r.fid, widths[1]),
      padRight(r.entry_id, widths[2]),
      padRight(r.bb.toString(), widths[3]),
      padRight(r.tc.toString(), widths[4]),
      padRight(r.fh.toString(), widths[5]),
      padRight(r.wc.toString(), widths[6]),
      padRight(r.leftStr, widths[7]),
    ];
    console.log(vals.join(' | '));
  }
}

function printCsv(rows) {
  const headers = ['Team', 'FID', 'Entry', 'BB', 'TC', 'FH', 'WC', 'Left'];
  console.log(toCsvRow(headers));
  for (const r of rows) {
    console.log(toCsvRow([r.team, r.fid, r.entry_id, r.bb, r.tc, r.fh, r.wc, r.leftStr]));
  }
}

async function main() {
  const { csv, concurrency } = parseArgs();
  const lookup = JSON.parse(readFileSync(lookupPath, 'utf8'));
  const managers = Array.isArray(lookup) ? lookup : [];
  if (managers.length === 0) {
    console.error('No managers found in fantasy-managers-lookup.json');
    process.exit(1);
  }

  console.log(`Managers: ${managers.length} | Concurrency: ${concurrency}`);

  // Process in batches respecting concurrency
  const results = [];
  let i = 0;
  async function worker() {
    while (i < managers.length) {
      const idx = i++;
      const m = managers[idx];
      const entryId = m.entry_id;
      const chipsUsed = await getChipsUsed(entryId);
      if (chipsUsed.error) {
        results.push({
          team: m.team_name || '',
          fid: m.fid || '',
          entry_id: entryId,
          bb: '-', tc: '-', fh: '-', wc: '-',
          leftStr: `error: ${chipsUsed.error}`,
        });
      } else {
        const left = chipsLeftFromUsed(chipsUsed);
        results.push({
          team: m.team_name || '',
          fid: m.fid || '',
          entry_id: entryId,
          bb: left.bboost,
          tc: left['3xc'],
          fh: left.freehit,
          wc: left.wildcard,
          leftStr: formatStatus(left),
        });
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // Sort by team name
  results.sort((a, b) => String(a.team).localeCompare(String(b.team)));

  if (csv) printCsv(results); else printTable(results);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

