import { NextResponse } from "next/server";

import { createKeyForCeremony } from "~/lib/qkms-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await createKeyForCeremony(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Key creation failed." },
      { status: 400 },
    );
  }
}
