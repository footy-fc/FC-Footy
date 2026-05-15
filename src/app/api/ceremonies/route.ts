import { NextRequest, NextResponse } from "next/server";

import { createCeremony } from "~/lib/qkms-store";
import { roleToSlot } from "~/lib/qkms-roles";
import type { ExternalRole, Role } from "~/lib/qkms-types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      requestedByRole?: Role;
      selectedParticipants?: ExternalRole[];
      inviteHours?: number;
    };

    if (body.requestedByRole !== "C") {
      return NextResponse.json(
        { error: "requestedByRole must be C." },
        { status: 400 },
      );
    }

    const selectedParticipants = body.selectedParticipants ?? ["M", "P"];

    const result = createCeremony({
      requestedByRole: body.requestedByRole,
      selectedParticipants,
      inviteHours: body.inviteHours,
    });
    const origin = request.nextUrl.origin;

    return NextResponse.json({
      ceremony: result.ceremony,
      inviteLinks: result.inviteRecords.map(({ invite, rawToken }) => ({
        role: invite.role,
        inviteUrl: `${origin}/invite?token=${rawToken}&role=${roleToSlot(invite.role)}`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ceremony failed." },
      { status: 400 },
    );
  }
}
