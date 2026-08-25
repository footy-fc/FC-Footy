import { NextRequest, NextResponse } from 'next/server';
import { keccak256, toUtf8Bytes } from 'ethers';
import { authenticateFootyUser } from '~/lib/farcaster/serverAuth';
import {
  getClaimSeason,
  getClaimStatus,
  saveChallenge,
  type FplChallengeRecord,
} from '~/lib/fplClaimServer';
import { FPL_CLAIM_CHALLENGE_SECONDS } from '~/lib/fplClaimConstants';

const FPL_BASE = 'https://fantasy.premierleague.com/api';
const FPL_HEADERS = {
  'User-Agent': 'FC-Footy/1.0 (FPL team claim)',
  Accept: 'application/json',
};

type FplEntry = {
  id?: number;
  entry_name?: string;
  player_first_name?: string;
  player_last_name?: string;
  current_event?: number;
};

type FplBootstrap = {
  events?: Array<{ id?: number; is_current?: boolean; finished?: boolean }>;
  elements?: Array<{ id?: number; web_name?: string; first_name?: string; second_name?: string }>;
};

type FplPicks = {
  picks?: Array<{ element?: number; position?: number }>;
};

type FplHistory = {
  current?: Array<{ bank?: number; value?: number; event?: number }>;
};

function parseEntryId(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const text = String(value);
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function fetchFplJson<T>(path: string): Promise<T> {
  const response = await fetch(`${FPL_BASE}${path}`, { headers: FPL_HEADERS, cache: 'no-store' });
  if (!response.ok) throw new Error(`FPL API returned ${response.status}`);
  return (await response.json()) as T;
}

function playerName(player: { web_name?: string; first_name?: string; second_name?: string } | undefined) {
  return player?.web_name || [player?.first_name, player?.second_name].filter(Boolean).join(' ') || 'Unknown player';
}

function uniqueChoices(answer: string, candidates: string[]) {
  const choices = [answer, ...candidates].filter((value, index, list) => value && list.indexOf(value) === index);
  return choices.slice(0, 4).sort(() => Math.random() - 0.5);
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    if (!authUser.fid) {
      return NextResponse.json({ error: 'A verified Farcaster FID is required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { entryId?: unknown };
    const entryId = parseEntryId(body.entryId);
    if (!entryId) return NextResponse.json({ error: 'entryId must be a positive integer' }, { status: 400 });

    const season = getClaimSeason();
    const status = await getClaimStatus(season, authUser.fid, entryId);
    if (!status.canClaim) {
      return NextResponse.json({ error: 'This FPL team or Farcaster identity already has an active claim', status }, { status: 409 });
    }

    const [entry, bootstrap] = await Promise.all([
      fetchFplJson<FplEntry>(`/entry/${entryId}/`),
      fetchFplJson<FplBootstrap>('/bootstrap-static/'),
    ]);

    const eventId =
      bootstrap.events?.find((event) => event.is_current)?.id ||
      entry.current_event ||
      bootstrap.events?.find((event) => !event.finished)?.id;

    if (!eventId) throw new Error('No current FPL gameweek is available');

    let picks: FplPicks = {};
    try {
      picks = await fetchFplJson<FplPicks>(`/entry/${entryId}/event/${eventId}/picks/`);
    } catch {
      // Before a new gameweek is available, use the latest finalized bank
      // balance as a deterministic fallback fact.
    }
    const elements = new Map((bootstrap.elements || []).map((element) => [element.id, element]));
    const bench = (picks.picks || [])
      .filter((pick) => typeof pick.position === 'number' && pick.position > 11)
      .sort((left, right) => (left.position || 0) - (right.position || 0));

    let question = `Who is currently in the second bench spot for Gameweek ${eventId}?`;
    let answer: string;
    let candidates: string[];
    let snapshot: Record<string, unknown>;

    if (bench[1]?.element) {
      answer = playerName(elements.get(bench[1].element));
      candidates = bench
        .filter((_, index) => index !== 1)
        .map((pick) => playerName(elements.get(pick.element)));
      snapshot = {
        entryId,
        entryName: entry.entry_name || null,
        eventId,
        bench: bench.map((pick) => pick.element || null),
      };
    } else {
      const history = await fetchFplJson<FplHistory>(`/entry/${entryId}/history/`);
      const latest = history.current?.at(-1);
      if (typeof latest?.bank !== 'number') throw new Error('This FPL team does not have enough current data for a challenge');
      const bank = latest.bank / 10;
      answer = `£${bank.toFixed(1)}m`;
      candidates = [bank + 0.1, Math.max(0, bank - 0.1), bank + 0.5].map((value) => `£${value.toFixed(1)}m`);
      question = 'What is your current FPL bank balance?';
      snapshot = { entryId, entryName: entry.entry_name || null, eventId: latest.event || eventId, bank: latest.bank, value: latest.value || null };
    }

    const choices = uniqueChoices(answer, candidates);
    while (choices.length < 4) choices.push(`Other squad player ${choices.length}`);

    const snapshotHash = keccak256(toUtf8Bytes(JSON.stringify(snapshot)));
    const now = Date.now();
    const record: Omit<FplChallengeRecord, 'challengeId'> = {
      fid: authUser.fid,
      entryId,
      season,
      question,
      choices,
      answer,
      snapshotHash,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + FPL_CLAIM_CHALLENGE_SECONDS * 1000,
    };

    const saved = await saveChallenge(record);
    return NextResponse.json({
      challengeId: saved.challengeId,
      entryId,
      season,
      question: saved.question,
      choices: saved.choices,
      expiresAt: saved.expiresAt,
      teamName: entry.entry_name || 'Selected FPL team',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[fpl-claim/challenge]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create FPL challenge' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
