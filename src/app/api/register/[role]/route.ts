import { NextRequest, NextResponse } from "next/server";

import { slotToRole } from "~/lib/qkms-roles";
import { registerParticipant } from "~/lib/qkms-store";
import type { ExternalRole, RegistrationBundle } from "~/lib/qkms-types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ role: string }> },
) {
  try {
    const { role } = await context.params;
    const normalizedRole = slotToRole(role);

    if (!normalizedRole) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const body = (await request.json()) as RegistrationBundle;
    const participant = await registerParticipant({
      ...body,
      role: normalizedRole as ExternalRole,
    });

    return NextResponse.json({ participant });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 400 },
    );
  }
}
