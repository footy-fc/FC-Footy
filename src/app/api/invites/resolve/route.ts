import { NextRequest, NextResponse } from "next/server";

import { resolveInviteToken } from "~/lib/qkms-store";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "token is required." }, { status: 400 });
    }

    return NextResponse.json(resolveInviteToken(token));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite resolution failed." },
      { status: 404 },
    );
  }
}
