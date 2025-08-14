import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json({ message: 'Missing NEXT_PUBLIC_NEYNAR_API_KEY' }, { status: 500 });
    }
    const { signerUuid, text, parentHash, parentAuthorFid } = (await request.json()) as {
      signerUuid: string;
      text: string;
      parentHash?: string;
      parentAuthorFid?: number;
    };
    if (!signerUuid || !text) {
      return NextResponse.json({ message: 'Missing signerUuid or text' }, { status: 400 });
    }
    const payload: any = {
      signer_uuid: signerUuid,
      text,
      channel_id: 'football',
    };
    if (parentHash && parentAuthorFid) {
      payload.parent = parentHash;
      payload.parent_author_fid = parentAuthorFid;
    }
    const resp = await fetch('https://api.neynar.com/v2/farcaster/cast/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(json || { message: 'Publish failed' }, { status: resp.status });
    }
    return NextResponse.json({ message: 'Cast published', result: json }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}

export const runtime = 'nodejs';


