import { NextResponse } from "next/server";

import { resetStore } from "~/lib/qkms-store";

export async function POST() {
  resetStore();
  return NextResponse.json({ success: true });
}
