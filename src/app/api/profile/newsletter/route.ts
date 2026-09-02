import { NextRequest, NextResponse } from "next/server";
import { authenticateFootyUser } from "~/lib/farcaster/serverAuth";
import { resolveFinalWhistleManagerContext } from "~/lib/newsletterContext";
import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
} from "~/lib/newsletterModel";
import {
  deleteFinalWhistleNewsletterPreference,
  getFinalWhistleNewsletterPreference,
  saveFinalWhistleNewsletterPreference,
} from "~/lib/newsletterPreferences";

type NewsletterRequestBody = {
  email?: unknown;
  subscribed?: unknown;
};

function authenticationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Authentication failed";
  return NextResponse.json({ error: message }, { status: 401 });
}

async function getAuthenticatedContext(request: NextRequest) {
  const authUser = await authenticateFootyUser(request);
  const context = await resolveFinalWhistleManagerContext(authUser.fid);
  return { authUser, context };
}

export async function GET(request: NextRequest) {
  try {
    const { authUser, context } = await getAuthenticatedContext(request);
    const preference = await getFinalWhistleNewsletterPreference(authUser.userId);

    return NextResponse.json(
      {
        ok: true,
        preference,
        context,
        subscribed: preference?.subscribed ?? false,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return authenticationError(error);
  }
}

async function savePreference(request: NextRequest) {
  try {
    const { authUser, context } = await getAuthenticatedContext(request);
    const body = (await request.json().catch(() => ({}))) as NewsletterRequestBody;
    const email = normalizeNewsletterEmail(body.email);

    if (!isValidNewsletterEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (typeof body.subscribed !== "boolean") {
      return NextResponse.json(
        { error: "subscribed must be a boolean." },
        { status: 400 }
      );
    }

    if (body.subscribed && !context) {
      return NextResponse.json(
        {
          error: "Link and verify your FPL team in Fantasy before subscribing.",
          code: "FPL_TEAM_REQUIRED",
        },
        { status: 409 }
      );
    }

    const preference = await saveFinalWhistleNewsletterPreference({
      userId: authUser.userId,
      fid: authUser.fid,
      email,
      subscribed: body.subscribed,
      context,
    });

    return NextResponse.json({ ok: true, preference, context });
  } catch (error) {
    return authenticationError(error);
  }
}

export async function PUT(request: NextRequest) {
  return savePreference(request);
}

// Retain these methods for compatibility with the first profile prototype.
export async function POST(request: NextRequest) {
  return savePreference(request);
}

export async function PATCH(request: NextRequest) {
  return savePreference(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await authenticateFootyUser(request);
    const deleted = await deleteFinalWhistleNewsletterPreference(authUser.userId);

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return authenticationError(error);
  }
}

export const runtime = "nodejs";
