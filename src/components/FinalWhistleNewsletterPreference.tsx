"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Check, Mail } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

type NewsletterPreference = {
  email: string;
  subscribed: boolean;
};

type NewsletterContext = {
  entryId: number;
  season: number;
  leagueIds: number[];
  managerLabel?: string;
};

type NewsletterPayload = {
  preference?: NewsletterPreference | null;
  context?: NewsletterContext | null;
  error?: string;
};

type FinalWhistleNewsletterPreferenceProps = {
  getAuthorizationHeaders: () => Promise<Record<string, string>>;
};

export default function FinalWhistleNewsletterPreference({
  getAuthorizationHeaders,
}: FinalWhistleNewsletterPreferenceProps) {
  const router = useRouter();
  const { user } = usePrivy();
  const [email, setEmail] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);
  const [context, setContext] = React.useState<NewsletterContext | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const accountEmail = user?.email?.address || "";

  React.useEffect(() => {
    let cancelled = false;

    const loadPreference = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const headers = await getAuthorizationHeaders();
        const response = await fetch("/api/profile/newsletter", {
          headers,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as NewsletterPayload;

        if (!response.ok) {
          throw new Error(payload.error || "Could not load newsletter settings.");
        }

        if (!cancelled) {
          setEmail(payload.preference?.email || accountEmail);
          setSubscribed(payload.preference?.subscribed ?? false);
          setContext(payload.context ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setEmail((current) => current || accountEmail);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load newsletter settings."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadPreference();
    return () => {
      cancelled = true;
    };
  }, [accountEmail, getAuthorizationHeaders]);

  const savePreference = async (nextSubscribed: boolean) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Add an email address to receive Final Whistle.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const headers = await getAuthorizationHeaders();
      const response = await fetch("/api/profile/newsletter", {
        method: "PUT",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          subscribed: nextSubscribed,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as NewsletterPayload;

      if (!response.ok || !payload.preference) {
        throw new Error(payload.error || "Could not save newsletter settings.");
      }

      setEmail(payload.preference.email);
      setSubscribed(payload.preference.subscribed);
      setContext(payload.context ?? context);
      setMessage(
        payload.preference.subscribed
          ? "You’re subscribed to Final Whistle."
          : "You’ve unsubscribed from Final Whistle."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save newsletter settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mt-4 overflow-hidden rounded-[22px] border border-deepPink/25 bg-[radial-gradient(circle_at_top_right,rgba(236,1,124,0.12),transparent_38%),linear-gradient(145deg,rgba(4,8,24,0.98),rgba(24,18,44,0.96))] p-4 text-lightPurple">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-deepPink">
            Newsletter
          </div>
          <h3 className="text-lg font-semibold text-notWhite">Final Whistle</h3>
          <p className="mt-1 text-sm leading-6 text-lightPurple">
            A weekly league note personalized to your FPL team.
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${subscribed ? "border-limeGreenOpacity/35 bg-limeGreenOpacity/10 text-limeGreen" : "border-lightPurple/15 bg-darkPurple text-lightPurple"}`}>
          {subscribed ? <Check className="h-5 w-5" aria-label="Subscribed" /> : <Mail className="h-5 w-5" aria-hidden="true" />}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-[18px] border border-lightPurple/12 bg-darkPurple/55 px-4 py-4 text-sm text-lightPurple">
          Loading your newsletter settings…
        </div>
      ) : context ? (
        <div className="mt-4 rounded-[18px] border border-limeGreenOpacity/20 bg-darkPurple/55 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-limeGreen">FPL team connected</div>
          <div className="mt-1 text-sm font-semibold text-notWhite">
            {context.managerLabel || `Manager #${context.entryId}`}
          </div>
          <div className="mt-0.5 text-xs text-lightPurple">
            Footy automatically adds your manager and league context.
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[18px] border border-[#fea282]/25 bg-[#fea282]/10 px-4 py-3">
          <div className="text-sm font-semibold text-notWhite">Connect your FPL team first</div>
          <p className="mt-1 text-xs leading-5 text-[#ffd7ca]">
            Final Whistle uses your verified manager and league data to personalize the note.
          </p>
          <button
            type="button"
            onClick={() => router.push("/?tab=fantasy")}
            className="mt-3 rounded-full border border-[#fea282]/30 px-3 py-2 text-xs font-semibold text-notWhite"
          >
            Open Fantasy
          </button>
        </div>
      )}

      {!isLoading ? (
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-lightPurple/80">
            Delivery email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            disabled={isSaving}
            onChange={(event) => {
              setEmail(event.target.value);
              setMessage(null);
              setError(null);
            }}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-lightPurple/20 bg-darkPurple px-3 py-3 text-base text-notWhite outline-none transition-colors placeholder:text-lightPurple/40 focus:border-deepPink disabled:opacity-60"
          />
        </label>
      ) : null}

      {!isLoading ? (
        subscribed ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isSaving || !email.trim()}
              onClick={() => void savePreference(true)}
              className="flex-1 rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save email"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void savePreference(false)}
              className="rounded-xl border border-lightPurple/20 px-4 py-3 text-sm font-semibold text-lightPurple transition-colors hover:bg-darkPurple disabled:opacity-50"
            >
              Unsubscribe
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isSaving || !email.trim() || !context}
            onClick={() => void savePreference(true)}
            className="mt-3 w-full rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Subscribing…" : "Subscribe to Final Whistle"}
          </button>
        )
      ) : null}

      {message ? <div className="mt-3 text-sm text-limeGreen">{message}</div> : null}
      {error ? <div role="alert" className="mt-3 text-sm text-[#ffd7ca]">{error}</div> : null}
      <p className="mt-3 text-xs leading-5 text-lightPurple/65">
        By subscribing, you agree to receive the weekly Final Whistle email. Unsubscribe here at any time.
      </p>
    </section>
  );
}
