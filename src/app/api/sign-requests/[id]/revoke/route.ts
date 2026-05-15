import { NextResponse } from "next/server";

import { revokeSignRequest } from "~/lib/qkms-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(revokeSignRequest(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Revoke failed." },
      { status: 400 },
    );
  }
}
