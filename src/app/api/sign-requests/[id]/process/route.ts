import { NextRequest, NextResponse } from "next/server";

import { processSignRequest } from "~/lib/qkms-store";
import type { Role } from "~/lib/qkms-types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { liveParticipants?: Role[] };

    if (!Array.isArray(body.liveParticipants) || body.liveParticipants.length < 2) {
      return NextResponse.json(
        { error: "liveParticipants must be a two-party role array." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await processSignRequest(id, body.liveParticipants),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed." },
      { status: 400 },
    );
  }
}
