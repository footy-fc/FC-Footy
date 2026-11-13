import { NextResponse } from 'next/server';
import { refreshAllGates } from '../goal-notification/lib/gate';

// Daily cron (10:00 UTC in vercel.json). Previously a stub returning
// { ok: true }; it now refreshes every league's fixture gate so the
// dispatcher starts each day with a fresh calendar of live windows.
// The dispatcher also self-refreshes a stale gate, so this is a
// warm-up, not a hard dependency — a failed refresh here never blocks
// notifications (the gate fails open).
export async function GET() {
  const refreshed = await refreshAllGates();
  const failed = refreshed.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    refreshed: refreshed.map((r) => ({ id: r.id, windows: r.windows })),
    failed: failed.map((r) => ({ id: r.id, error: r.error })),
  });
}
