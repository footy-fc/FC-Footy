import { NextResponse } from "next/server";

import { getDashboardData } from "~/lib/qkms-store";

export async function GET() {
  return NextResponse.json(getDashboardData());
}
