import { NextResponse } from "next/server";

import { archiveSignRequest } from "~/lib/qkms-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(archiveSignRequest(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Archive failed." },
      { status: 400 },
    );
  }
}
