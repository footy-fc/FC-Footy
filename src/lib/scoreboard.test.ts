import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchScoreboardEvents } from './scoreboard.ts';

const base = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/eng.league_cup/scoreboard';
const now = new Date('2026-09-15T20:15:00Z');
const event = (id: string, state: string, score = '0', details: string[] = []) => ({
  id, status: { type: { state } },
  competitions: [{ competitors: [{ score }], details }],
});

test('daily EFL Cup data replaces stale range scores, status and key moments together', async () => {
  const scheduled = event('401914268', 'pre');
  const live = event('401914268', 'in', '3', ['Goal']);
  const previous = event('previous', 'post', '4');
  const upcoming = event('upcoming', 'pre');
  const requests: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const dates = new URL(String(input)).searchParams.get('dates')!;
    requests.push(dates);
    assert.equal(init?.cache, 'no-store');
    return Response.json({ events: dates.includes('-') ? [previous, scheduled, upcoming]
      : dates === '20260915' ? [live] : [] });
  };
  const result = await fetchScoreboardEvents(base, { pastDays: 7, futureDays: 7 }, { now, fetcher });
  assert.deepEqual(result, [previous, live, upcoming]);
  assert.deepEqual(requests, ['20260908-20260922', '20260915', '20260914']);
});

test('includes daily events omitted from the range and refreshes games across UTC midnight', async () => {
  const live = event('yesterday', 'in', '2', ['Goal']);
  const fetcher: typeof fetch = async input => Response.json({
    events: new URL(String(input)).searchParams.get('dates') === '20260914' ? [live] : [],
  });
  assert.deepEqual(await fetchScoreboardEvents(base, { pastDays: 7, futureDays: 7 }, { now, fetcher }), [live]);
});

test('failed daily request rejects the refresh instead of publishing stale range data', async () => {
  const fetcher: typeof fetch = async input => new URL(String(input)).searchParams.get('dates') === '20260915'
    ? new Response(null, { status: 503 }) : Response.json({ events: [event('match', 'pre')] });
  await assert.rejects(fetchScoreboardEvents(base, { pastDays: 7, futureDays: 7 }, { now, fetcher }), /503/);
});

test('default scoreboard remains a single request and forwards cancellation', async () => {
  const controller = new AbortController();
  let count = 0;
  const fetcher: typeof fetch = async (input, init) => {
    count++;
    assert.equal(input, base);
    assert.equal(init?.signal, controller.signal);
    return Response.json({ events: [] });
  };
  await fetchScoreboardEvents(base, undefined, { fetcher, signal: controller.signal });
  assert.equal(count, 1);
});

test('zero past-day window does not add yesterday and handles year boundaries', async () => {
  const dates: string[] = [];
  const fetcher: typeof fetch = async input => {
    dates.push(new URL(String(input)).searchParams.get('dates')!);
    return Response.json({ events: [] });
  };
  await fetchScoreboardEvents(base, { pastDays: 0, futureDays: 7 }, {
    now: new Date('2026-12-31T23:59:00Z'), fetcher,
  });
  assert.deepEqual(dates, ['20261231-20270107', '20261231']);
});

test('400 range response falls back to every single day without duplicate overlay requests', async () => {
  const requests: string[] = [];
  const live = event('live', 'in', '2', ['Goal']);
  const recent = event('recent', 'post', '3');
  const upcoming = event('upcoming', 'pre');
  const fetcher: typeof fetch = async input => {
    const dates = new URL(String(input)).searchParams.get('dates')!;
    requests.push(dates);
    if (dates.includes('-')) return Response.json({ message: 'Failed to get events endpoint.' }, { status: 400 });
    return Response.json({ events: dates === '20260917' ? [live]
      : dates === '20260910' ? [recent] : dates === '20260924' ? [upcoming] : [] });
  };
  const result = await fetchScoreboardEvents(base, { pastDays: 7, futureDays: 7 }, {
    now: new Date('2026-09-17T01:00:00Z'), fetcher,
  });
  assert.deepEqual(result, [recent, live, upcoming]);
  assert.equal(requests[0], '20260910-20260924');
  assert.equal(requests.length, 16);
  assert.equal(new Set(requests).size, 16);
});

test('failed daily fallback rejects instead of publishing an incomplete fixture window', async () => {
  const fetcher: typeof fetch = async input => {
    const dates = new URL(String(input)).searchParams.get('dates')!;
    return dates.includes('-') || dates === '20260910'
      ? new Response(null, { status: 400 }) : Response.json({ events: [] });
  };
  await assert.rejects(fetchScoreboardEvents(base, { pastDays: 7, futureDays: 7 }, { now, fetcher }), /400/);
});

test('cancelled range requests do not launch daily fallback requests', async () => {
  const controller = new AbortController();
  let requests = 0;
  const fetcher: typeof fetch = async () => {
    requests++;
    controller.abort();
    throw new DOMException('Aborted', 'AbortError');
  };
  await assert.rejects(fetchScoreboardEvents(base, { pastDays: 7, futureDays: 7 }, {
    now, fetcher, signal: controller.signal,
  }), /Aborted/);
  assert.equal(requests, 3);
});
