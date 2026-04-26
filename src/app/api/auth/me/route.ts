import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest } from "next/server";

const client = createClient();

function resolveRequestDomain(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";
  return host.split(":")[0];
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const token = authorization.slice("Bearer ".length).trim();
  const domain = resolveRequestDomain(request);

  if (!token || !domain) {
    return Response.json({ error: "Missing token or domain" }, { status: 400 });
  }

  try {
    const payload = await client.verifyJwt({
      token,
      domain,
    });

    const fid = Number(payload.sub);
    if (!Number.isFinite(fid) || fid <= 0) {
      return Response.json({ error: "Invalid fid" }, { status: 401 });
    }

    return Response.json({ fid, payload });
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    console.error("Quick Auth verification failed:", error);
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }
}
