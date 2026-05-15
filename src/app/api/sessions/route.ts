import { NextRequest, NextResponse } from "next/server";

import { createCeremony, getDashboardData } from "~/lib/qkms-store";

export async function GET() {
  return NextResponse.json({
    sessions: getDashboardData().ceremonies,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { inviteHours?: number };
    const result = createCeremony({
      requestedByRole: "C",
      selectedParticipants: ["M", "P"],
      inviteHours: body.inviteHours,
      origin: request.nextUrl.origin,
    });

    return NextResponse.json({
      session: result.ceremony,
      joinLinks: result.ceremony.joinLinks ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Session creation failed." },
      { status: 400 },
    );
  }
}
