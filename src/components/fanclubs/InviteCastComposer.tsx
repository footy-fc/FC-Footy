"use client";

import { useEffect, useMemo, useState } from "react";
import { buildMentionedCastText } from "~/lib/farcaster/mentions";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

type InviteCastComposerProps = {
  target: {
    fid: number;
    username?: string;
  };
  launchUrl: string;
  imageUrl: string;
  defaultMessage: string;
  suggestions: string[];
};

export function InviteCastComposer({
  target,
  launchUrl,
  imageUrl,
  defaultMessage,
  suggestions,
}: InviteCastComposerProps) {
  const {
    runtime,
    hasFootySession,
    hasLinkedFarcaster,
    hasSigner,
    onboardingState,
    beginPrivyLogin,
    beginLinkFarcaster,
    beginSignerAuthorization,
    signCast,
    submitSignedMessage,
  } = useFootyFarcaster();
  const [message, setMessage] = useState(defaultMessage);
  const [status, setStatus] = useState<"idle" | "posting" | "posted">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  const preview = useMemo(() => {
    if (!target.username) {
      return { text: message.trim(), mentions: [], mentionsPositions: [] };
    }

    return buildMentionedCastText(target.username, target.fid, message);
  }, [message, target.fid, target.username]);
  const previewBytes = useMemo(() => new TextEncoder().encode(preview.text).length, [preview.text]);

  const buttonLabel =
    status === "posting"
      ? "Posting banter..."
      : status === "posted"
        ? "Banter sent"
        : !hasFootySession && runtime === "miniapp"
          ? "Authorize Footy to cast"
          : !hasFootySession
            ? "Sign in to cast"
            : !hasLinkedFarcaster
              ? "Connect Farcaster"
              : !hasSigner || onboardingState === "needs_farcaster_signer"
                ? "Authorize signer"
                : "Cast banter";

  const handlePost = async () => {
    setFeedback(null);

    if (!hasFootySession) {
      try {
        await beginPrivyLogin();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to open Footy sign in.");
      }
      return;
    }

    if (!hasLinkedFarcaster) {
      try {
        await beginLinkFarcaster();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to connect Farcaster.");
      }
      return;
    }

    if (!hasSigner) {
      try {
        await beginSignerAuthorization();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to authorize the signer.");
      }
      return;
    }

    try {
      setStatus("posting");
      const signedMessage = await signCast({
        text: preview.text,
        embeds: [launchUrl, imageUrl],
        mentions: preview.mentions,
        mentionsPositions: preview.mentionsPositions,
      });
      await submitSignedMessage(signedMessage);
      setStatus("posted");
      setFeedback("Banter cast sent from Footy.");
    } catch (error) {
      setStatus("idle");
      setFeedback(error instanceof Error ? error.message : "Unable to post the banter right now.");
    }
  };

  return (
    <div className="rounded-[24px] border border-deepPink/25 bg-[linear-gradient(180deg,rgba(37,21,56,0.95),rgba(10,10,24,0.96))] p-4">
      <div className="mb-2 app-eyebrow">Banter Composer</div>
      <h4 className="text-xl font-semibold text-notWhite">Cast the line, not the life story</h4>
      <p className="mt-2 text-sm text-lightPurple">
        This posts publicly from Footy inside the client app. Keep it sharp, short, and aimed at the badge story you just looked up.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setMessage(suggestion)}
            className="rounded-full border border-limeGreenOpacity/20 bg-darkPurple/70 px-3 py-2 text-xs font-medium text-lightPurple transition-colors hover:border-limeGreenOpacity/40 hover:bg-darkPurple"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        maxLength={260}
        placeholder="Write your banter"
        className="mt-4 w-full rounded-[18px] border border-limeGreenOpacity/25 bg-darkPurple px-3 py-3 text-[16px] text-notWhite placeholder:text-lightPurple/50 focus:border-deepPink focus:outline-none"
      />

      <div className="mt-4 rounded-[20px] border border-limeGreenOpacity/20 bg-black/20 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-deepPink/20 text-sm font-semibold text-[#fea282]">
            F
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-notWhite">Footy cast preview</div>
            <div className="text-xs text-lightPurple">Public post from the miniapp</div>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-[15px] leading-6 text-notWhite">{preview.text || "Write your banter"}</p>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-lightPurple/75">
        <span>{preview.mentions.length > 0 ? `Will mention @${target.username}` : "No mention target available"}</span>
        <span>{previewBytes}/320 bytes</span>
      </div>

      <button
        type="button"
        onClick={() => void handlePost()}
        disabled={status === "posting" || status === "posted"}
        className="mt-4 w-full rounded-[18px] bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-fontRed disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buttonLabel}
      </button>

      {feedback ? <p className="mt-3 text-sm text-lightPurple">{feedback}</p> : null}
    </div>
  );
}
