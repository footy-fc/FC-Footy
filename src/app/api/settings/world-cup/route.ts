/**
 * GET  /api/settings/world-cup   → { ok, enabled }
 * POST /api/settings/world-cup   → set { enabled } (admin passkey required)
 *
 * Runtime toggle for the festive World Cup experience. Falls back to the
 * WORLD_CUP_MODE default in config.ts when no override has been stored.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorldCupModeSetting, setWorldCupModeSetting } from "~/lib/appSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await getWorldCupModeSetting();
  return NextResponse.json({ ok: true, enabled });
}

export async function POST(req: NextRequest) {
  let body: { enabled?: unknown; apiKey?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const providedKey =
    (typeof body.apiKey === "string" ? body.apiKey : null) ??
    req.headers.get("x-admin-key");
  const adminKey = process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY;

  if (!adminKey || providedKey !== adminKey) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "`enabled` boolean is required" },
      { status: 400 }
    );
  }

  try {
    await setWorldCupModeSetting(body.enabled);
    return NextResponse.json({ ok: true, enabled: body.enabled });
  } catch (err) {
    console.error("Failed to set world-cup mode", err);
    return NextResponse.json({ ok: false, error: "Failed to persist setting" }, { status: 500 });
  }
}
