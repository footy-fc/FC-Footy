import { NextRequest, NextResponse } from "next/server";

import { approveSignRequest } from "~/lib/qkms-store";
import type { Role } from "~/lib/qkms-types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      role?: Role;
      walletAddress?: string;
      approvalMessage?: string;
      approvalSignature?: string;
    };

    if (
      !body.role ||
      !body.walletAddress ||
      !body.approvalMessage ||
      !body.approvalSignature
    ) {
      return NextResponse.json(
        {
          error:
            "role, walletAddress, approvalMessage, and approvalSignature are required.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await approveSignRequest({
        id,
        role: body.role,
        walletAddress: body.walletAddress,
        approvalMessage: body.approvalMessage,
        approvalSignature: body.approvalSignature,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Approval failed." },
      { status: 400 },
    );
  }
}
