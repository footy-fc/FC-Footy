import { NextResponse } from "next/server";
import { probeQStorage } from "~/lib/qstorage";

export async function GET() {
  try {
    const result = await probeQStorage();
    const status = result.put.ok ? 200 : 500;
    return NextResponse.json(result, { status });
  } catch (error) {
    const maybeError = error as { name?: string; message?: string };

    return NextResponse.json(
      {
        error: "QStorage probe failed",
        details: {
          name: maybeError?.name,
          message: maybeError?.message,
        },
      },
      { status: 500 }
    );
  }
}
