import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key') || '';
    if (!process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, beneficiary, percentBps } = await req.json();
    if (!projectId || !beneficiary || percentBps === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // TODO: Implement on-chain call to create JBSplitHook and set it on the project splits.
    // This typically requires a signer with permission to configure splits on the project.
    // For now, respond with 501 to indicate server-side implementation needed.
    return NextResponse.json({ error: 'Not Implemented: server must perform Juicebox split hook tx' }, { status: 501 });
  } catch {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
