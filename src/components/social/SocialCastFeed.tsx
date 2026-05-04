"use client";

import React from "react";
import SocialCastCard from "~/components/social/SocialCastCard";
import type { SocialFeedCast } from "~/components/social/types";

type SocialCastFeedProps = {
  eyebrow: string;
  title: string;
  loading: boolean;
  error?: string | null;
  emptyMessage: string;
  casts: SocialFeedCast[];
  badgeLogoUrl?: string | null;
  badgeAlt?: string | null;
};

export default function SocialCastFeed({
  eyebrow,
  title,
  loading,
  error,
  emptyMessage,
  casts,
  badgeLogoUrl,
  badgeAlt,
}: SocialCastFeedProps) {
  return (
    <div className="mt-4 rounded-[26px] border border-limeGreenOpacity/20 bg-[linear-gradient(180deg,rgba(25,18,40,0.96),rgba(7,9,20,0.98))] p-4 text-lightPurple shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="app-eyebrow mb-2">{eyebrow}</div>
      <h3 className="text-xl font-semibold text-notWhite">{title}</h3>

      {loading ? (
        <p className="mt-3 text-sm text-lightPurple">Loading recent casts...</p>
      ) : error ? (
        <p className="mt-3 text-sm text-[#fea282]">{error}</p>
      ) : casts.length === 0 ? (
        <p className="mt-3 text-sm text-lightPurple">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {casts.map((cast) => (
            <SocialCastCard
              key={cast.hash}
              cast={cast}
              badgeLogoUrl={badgeLogoUrl}
              badgeAlt={badgeAlt}
              actionHref={`https://warpcast.com/~/conversations/${cast.hash}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
