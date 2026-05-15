import { NextRequest, NextResponse } from "next/server";

import { roleToSlot } from "~/lib/qkms-roles";
import { createInvite } from "~/lib/qkms-store";
import type { ExternalRole } from "~/lib/qkms-types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      role?: ExternalRole;
      expiresInHours?: number;
    };

    if (body.role !== "M" && body.role !== "P") {
      return NextResponse.json({ error: "Role must be Invitee 1 or Invitee 2." }, { status: 400 });
    }

    const { invite, rawToken } = createInvite(body.role, body.expiresInHours ?? 24);
    const origin = request.nextUrl.origin;

    return NextResponse.json({
      invite,
      inviteUrl: `${origin}/invite?token=${rawToken}&role=${roleToSlot(body.role)}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite creation failed." },
      { status: 500 },
    );
  }
}
