import { NextResponse } from "next/server";

import { getCeremonyById, getDashboardData } from "~/lib/qkms-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const ceremony = getCeremonyById(id);
    const dashboard = getDashboardData();

    return NextResponse.json({
      session: ceremony,
      participants: dashboard.participants,
      keys: dashboard.keys,
      auditEvents: dashboard.auditEvents,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Session load failed." },
      { status: 404 },
    );
  }
}
