import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PINATA_PIN_JSON_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const MAX_JSON_BYTES = 256 * 1024;

type PinJsonRequest = {
  name?: unknown;
  json?: unknown;
  pinataMetadata?: {
    name?: unknown;
    keyvalues?: unknown;
  };
};

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

function configuredAuthToken() {
  return process.env.PINATA_API_SHARED_SECRET || "";
}

function requireRouteAuth(request: NextRequest) {
  const expectedToken = configuredAuthToken();
  if (!expectedToken) return null;

  const authHeader = request.headers.get("authorization") || "";
  const receivedToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (receivedToken !== expectedToken) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

function sanitizePinName(name: unknown) {
  if (typeof name !== "string") return "";

  return name
    .trim()
    .replace(/[^\w.\-:/ ]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function getGatewayUrl(cid: string) {
  const configuredGateway =
    process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

  return `${configuredGateway.replace(/\/+$/, "")}/${cid}`;
}

function isJsonValue(value: unknown): value is null | boolean | number | string | unknown[] | Record<string, unknown> {
  if (value === null) return true;

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return Number.isFinite(value as number) || valueType !== "number";
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (valueType === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const authError = requireRouteAuth(request);
  if (authError) return authError;

  let payload: PinJsonRequest;
  try {
    payload = (await request.json()) as PinJsonRequest;
  } catch {
    return jsonResponse({ ok: false, error: "Request body must be JSON" }, { status: 400 });
  }

  const json = payload.json;
  if (json === undefined) {
    return jsonResponse({ ok: false, error: "Missing required `json` field" }, { status: 400 });
  }

  if (!isJsonValue(json)) {
    return jsonResponse({ ok: false, error: "`json` must be JSON-serializable" }, { status: 400 });
  }

  const serializedJson = JSON.stringify(json);
  if (Buffer.byteLength(serializedJson, "utf8") > MAX_JSON_BYTES) {
    return jsonResponse({ ok: false, error: "JSON payload is too large" }, { status: 413 });
  }

  const name =
    sanitizePinName(payload.name) ||
    sanitizePinName(payload.pinataMetadata?.name) ||
    `fc-footy-metadata-${Date.now()}.json`;

  const pinataMetadata = {
    name,
    ...(payload.pinataMetadata?.keyvalues &&
    typeof payload.pinataMetadata.keyvalues === "object" &&
    !Array.isArray(payload.pinataMetadata.keyvalues)
      ? { keyvalues: payload.pinataMetadata.keyvalues }
      : {}),
  };

  try {
    const response = await fetch(PINATA_PIN_JSON_ENDPOINT, {
      method: "POST",
      headers: {
        ...getPinataAuthHeaders(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        pinataMetadata,
        pinataContent: json,
      }),
      cache: "no-store",
    });

    const pinataPayload = (await response.json().catch(() => ({}))) as PinataResponse & {
      error?: string;
      message?: string;
    };

    if (!response.ok || !pinataPayload.IpfsHash) {
      return jsonResponse(
        {
          ok: false,
          error: pinataPayload.error || pinataPayload.message || "Pinata pinJSONToIPFS failed",
          status: response.status,
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    const cid = pinataPayload.IpfsHash;
    const uri = `ipfs://${cid}`;

    return jsonResponse({
      ok: true,
      provider: "pinata",
      name,
      cid,
      uri,
      gatewayUrl: getGatewayUrl(cid),
      IpfsHash: cid,
      PinSize: pinataPayload.PinSize,
      Timestamp: pinataPayload.Timestamp,
      isDuplicate: pinataPayload.isDuplicate,
    });
  } catch (error) {
    console.error("pin-json failed", error);
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to pin JSON",
      },
      { status: 500 }
    );
  }
}
