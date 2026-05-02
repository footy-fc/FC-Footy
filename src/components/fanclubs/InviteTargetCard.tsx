"use client";

import Image from "next/image";

type InviteTargetCardProps = {
  user: {
    fid: number;
    username?: string;
    pfp?: string;
  };
  favoriteTeams: string[];
  primaryClub?: {
    id: string;
    name: string;
    logoUrl: string;
  } | null;
  primaryCountry?: {
    id: string;
    name: string;
    logoUrl: string;
  } | null;
};

export function InviteTargetCard({
  user,
  favoriteTeams,
  primaryClub,
  primaryCountry,
}: InviteTargetCardProps) {
  const hasClub = Boolean(primaryClub);
  const hasCountry = Boolean(primaryCountry);

  const headline = `@${user.username || `fid${user.fid}`}`;
  let body = "Needs a badge and a country before the tournament noise really starts.";

  if (hasClub && !hasCountry) {
    body = `${primaryClub?.name} is locked in. Country identity is still missing for the World Cup run.`;
  } else if (!hasClub && hasCountry) {
    body = `${primaryCountry?.name} is locked in. Club badge is still missing.`;
  } else if (hasClub && hasCountry) {
    body = "Already in the fight. This is a compare-badges moment, not a join-from-zero moment.";
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-limeGreenOpacity/25 bg-[radial-gradient(circle_at_top_left,rgba(255,0,102,0.18),transparent_32%),linear-gradient(155deg,rgba(4,8,24,0.98),rgba(30,18,46,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mb-3 flex items-start gap-4">
        <Image
          src={user.pfp || "/512.png"}
          alt={user.username || "Footy fan"}
          width={72}
          height={72}
          className="h-[72px] w-[72px] rounded-full border-2 border-limeGreen object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="app-eyebrow mb-2">Invite Target</div>
          <h3 className="truncate text-[28px] font-semibold leading-none text-notWhite">{headline}</h3>
          <p className="mt-2 text-sm text-lightPurple">{body}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-limeGreenOpacity/20 bg-darkPurple/75 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-lightPurple/70">Club Badge</div>
          {primaryClub ? (
            <div className="flex items-center gap-3">
              <Image src={primaryClub.logoUrl} alt={primaryClub.name} width={28} height={28} className="rounded-full" />
              <span className="text-sm font-semibold text-notWhite">{primaryClub.name}</span>
            </div>
          ) : (
            <div className="text-sm text-[#fea282]">Not chosen yet</div>
          )}
        </div>

        <div className="rounded-[18px] border border-limeGreenOpacity/20 bg-darkPurple/75 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-lightPurple/70">Country</div>
          {primaryCountry ? (
            <div className="flex items-center gap-3">
              <Image src={primaryCountry.logoUrl} alt={primaryCountry.name} width={28} height={28} className="rounded-full" />
              <span className="text-sm font-semibold text-notWhite">{primaryCountry.name}</span>
            </div>
          ) : (
            <div className="text-sm text-[#fea282]">Missing World Cup identity</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-dashed border-limeGreenOpacity/30 bg-black/20 px-4 py-3 text-sm text-lightPurple">
        {favoriteTeams.length > 0
          ? `Tracking ${favoriteTeams.length} badge${favoriteTeams.length === 1 ? "" : "s"} in Footy.`
          : "No Footy identity recorded yet."}
      </div>
    </div>
  );
}
