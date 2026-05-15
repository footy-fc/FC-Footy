import { NextRequest, NextResponse } from "next/server";

import { joinCeremony } from "~/lib/qkms-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { role?: "M" | "P" };

    if (body.role !== "M" && body.role !== "P") {
      return NextResponse.json({ error: "Role must be M or P." }, { status: 400 });
    }

    return NextResponse.json(joinCeremony(id, body.role));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Join failed." },
      { status: 400 },
    );
  }
}
