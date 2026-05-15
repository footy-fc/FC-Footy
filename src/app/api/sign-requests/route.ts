import { NextRequest, NextResponse } from "next/server";

import { createSignRequest } from "~/lib/qkms-store";
import type { ActionType } from "~/lib/qkms-types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title?: string;
      keyId?: string;
      actionType?: ActionType;
      payloadHash?: string;
    };

    if (!body.title || !body.keyId || !body.payloadHash || !body.actionType) {
      return NextResponse.json(
        { error: "title, keyId, actionType, and payloadHash are required." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      createSignRequest({
        title: body.title,
        keyId: body.keyId,
        actionType: body.actionType,
        payloadHash: body.payloadHash,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign request failed." },
      { status: 400 },
    );
  }
}
