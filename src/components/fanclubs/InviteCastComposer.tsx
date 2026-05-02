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
};

export function InviteCastComposer({
  target,
  launchUrl,
  imageUrl,
  defaultMessage,
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

  const buttonLabel =
    status === "posting"
      ? "Posting invite..."
      : status === "posted"
        ? "Invite sent"
        : !hasFootySession && runtime === "miniapp"
          ? "Authorize Footy to cast"
          : !hasFootySession
            ? "Sign in to cast"
            : !hasLinkedFarcaster
              ? "Connect Farcaster"
              : !hasSigner || onboardingState === "needs_farcaster_signer"
                ? "Authorize signer"
                : "Cast invite";

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
      setFeedback("Invite cast sent from Footy.");
    } catch (error) {
      setStatus("idle");
      setFeedback(error instanceof Error ? error.message : "Unable to post the invite right now.");
    }
  };

  return (
    <div className="rounded-[24px] border border-deepPink/25 bg-[linear-gradient(180deg,rgba(37,21,56,0.95),rgba(10,10,24,0.96))] p-4">
      <div className="mb-2 app-eyebrow">Public Invite</div>
      <h4 className="text-xl font-semibold text-notWhite">Make it a cast, not a whisper</h4>
      <p className="mt-2 text-sm text-lightPurple">
        This posts publicly from Footy inside the client app and opens the main Footy entry when people tap in.
      </p>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        maxLength={260}
        className="mt-4 w-full rounded-[18px] border border-limeGreenOpacity/25 bg-darkPurple px-3 py-3 text-[16px] text-notWhite placeholder:text-lightPurple/50 focus:border-deepPink focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-between text-xs text-lightPurple/75">
        <span>{preview.mentions.length > 0 ? `Will mention @${target.username}` : "No mention target available"}</span>
        <span>{preview.text.length}/320</span>
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
