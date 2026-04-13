// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadToQStorage } from '../../../lib/qstorage';

function firstContentType(headerValue: string | null) {
  return headerValue?.split(";")[0].trim() || "application/octet-stream";
}

export async function POST(req: NextRequest) {
  try {
    console.log('Upload API called');

    const contentTypeHeader = req.headers.get("content-type");
    const objectKeyParam =
      req.nextUrl.searchParams.get("objectKey") ||
      req.headers.get("x-object-key") ||
      undefined;

    let buffer: Buffer;
    let fileName = req.headers.get("x-file-name") || "upload";
    let contentType = firstContentType(contentTypeHeader);

    if (contentTypeHeader?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const objectKeyFromForm = formData.get("objectKey");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
      }

      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name || fileName;
      contentType = file.type || contentType;

      const uploadResult = await uploadToQStorage({
        body: buffer,
        contentType,
        fileName,
        objectKey:
          typeof objectKeyFromForm === "string" && objectKeyFromForm.length > 0
            ? objectKeyFromForm
            : objectKeyParam,
      });

      return NextResponse.json(uploadResult);
    }

    const data = await req.arrayBuffer();
    console.log('Received data size:', data.byteLength);

    buffer = Buffer.from(data);

    const uploadResult = await uploadToQStorage({
      body: buffer,
      contentType,
      fileName,
      objectKey: objectKeyParam,
    });
    console.log('QStorage upload success:', uploadResult.objectKey);

    return NextResponse.json(uploadResult);
  } catch (error) {
    console.error('QStorage Upload Failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });

    return NextResponse.json({ 
      error: 'QStorage Upload Failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
