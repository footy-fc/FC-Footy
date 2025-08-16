// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pinata } from '../../../lib/pinataconfig';

export async function POST(req: NextRequest) {
  try {
    console.log('Upload API called');
    
    // Debug: Log environment variable status

    
    // Check if Pinata JWT is configured
    const pinataJwt = process.env.NEXT_PUBLIC_PINATAJWT || process.env.PINATA_JWT;
    const pinataGateway = process.env.NEXT_PUBLIC_PINATAGATEWAY || process.env.PINATA_GATEWAY;
    
    if (!pinataJwt) {
      console.error('Pinata JWT not configured');
      return NextResponse.json({ 
        error: 'Pinata JWT not configured. Please set NEXT_PUBLIC_PINATAJWT environment variable.',
        details: 'Get your JWT from https://app.pinata.cloud/'
      }, { status: 500 });
    }
    
    if (!pinataGateway) {
      console.error('Pinata Gateway not configured');
      return NextResponse.json({ error: 'Pinata Gateway not configured' }, { status: 500 });
    }

    const data = await req.arrayBuffer();
    console.log('Received data size:', data.byteLength);
    
    const buffer = Buffer.from(data);
    const file = new File([buffer], 'uploaded_image.png', { type: 'image/png' });
    console.log('Created file:', file.name, file.size);

    // Upload the file to Pinata IPFS
    console.log('Uploading to Pinata...');
    const result = await pinata.upload.file(file);
    console.log('IPFS Upload Success:', result);
    
    return NextResponse.json({ ipfsHash: result.IpfsHash });
  } catch (error) {
    console.error('IPFS Upload Failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    

    
    return NextResponse.json({ 
      error: 'IPFS Upload Failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
