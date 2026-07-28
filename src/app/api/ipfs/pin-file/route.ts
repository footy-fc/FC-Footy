import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PINATA_PIN_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type PinataResponse = {
  IpfsHash?: string;
  PinSize?: number;
  Timestamp?: string;
  isDuplicate?: boolean;
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders(),
      ...init?.headers,
    },
  });
}

function requireRouteAuth(request: NextRequest) {
  const expectedToken = process.env.PINATA_API_SHARED_SECRET || "";
  if (!expectedToken) return null;

  const authHeader = request.headers.get("authorization") || "";
  const receivedToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (receivedToken !== expectedToken) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

function getPinataAuthHeaders(): Record<string, string> {
  if (process.env.PINATA_JWT) {
    return { Authorization: `Bearer ${process.env.PINATA_JWT}` };
  }

  if (process.env.PINATA_API_KEY && process.env.PINATA_API_SHARED_SECRET) {
    return {
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_API_SHARED_SECRET,
    };
  }

  throw new Error("Missing PINATA_JWT or PINATA_API_KEY/PINATA_API_SHARED_SECRET");
}

function getGatewayUrl(cid: string) {
  const configuredGateway = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";
  return `${configuredGateway.replace(/\/+$/, "")}/${cid}`;
}

function sanitizePinName(name: unknown) {
  if (typeof name !== "string") return "";

  return name
    .trim()
    .replace(/[^\w.\-:/ ]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const authError = requireRouteAuth(request);
  if (authError) return authError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: "Request body must be multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonResponse({ ok: false, error: "Missing required `file` field" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return jsonResponse({ ok: false, error: "File is too large" }, { status: 413 });
  }

  const name = sanitizePinName(formData.get("name")) || sanitizePinName(file.name) || `fc-footy-file-${Date.now()}`;
  const pinataFormData = new FormData();
  pinataFormData.append("file", file, name);
  pinataFormData.append(
    "pinataMetadata",
    JSON.stringify({
      name,
    })
  );

  try {
    const response = await fetch(PINATA_PIN_FILE_ENDPOINT, {
      method: "POST",
      headers: {
        ...getPinataAuthHeaders(),
        accept: "application/json",
      },
      body: pinataFormData,
      cache: "no-store",
    });

    const pinataPayload = (await response.json().catch(() => ({}))) as PinataResponse & {
      error?: unknown;
      message?: string;
    };

    if (!response.ok || !pinataPayload.IpfsHash) {
      return jsonResponse(
        {
          ok: false,
          error: pinataPayload.error || pinataPayload.message || "Pinata pinFileToIPFS failed",
          status: response.status,
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    const cid = pinataPayload.IpfsHash;

    return jsonResponse({
      ok: true,
      provider: "pinata",
      name,
      cid,
      uri: `ipfs://${cid}`,
      gatewayUrl: getGatewayUrl(cid),
      IpfsHash: cid,
      PinSize: pinataPayload.PinSize,
      Timestamp: pinataPayload.Timestamp,
      isDuplicate: pinataPayload.isDuplicate,
    });
  } catch (error) {
    console.error("pin-file failed", error);
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to pin file",
      },
      { status: 500 }
    );
  }
}
