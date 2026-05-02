"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchFanUserData } from "~/components/utils/fetchFCProfile";
import { fetchTeamLogos } from "~/components/utils/fetchTeamLogos";
import { InviteCastComposer } from "~/components/fanclubs/InviteCastComposer";
import { InviteTargetCard } from "~/components/fanclubs/InviteTargetCard";
import { getTeamPreferences } from "~/lib/kvPerferences";
import { summarizePreferences } from "~/lib/fanclubs/preferencesSummary";
import { getFootyShareContext } from "~/lib/farcaster/shareContext";
import { BASE_URL } from "~/lib/config";

type Team = {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
};

type FanClubInviteExperienceProps = {
  viewerFid?: number;
  profileFid: number;
  castHash?: string;
  inviteUsername?: string;
};

type InviteMode = "join_footy" | "pick_club" | "pick_country" | "already_active";

export function FanClubInviteExperience({
  viewerFid,
  profileFid,
  castHash,
  inviteUsername,
}: FanClubInviteExperienceProps) {
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<{ fid: number; username?: string; pfp?: string }>({ fid: profileFid });
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isShareEntry, setIsShareEntry] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [shareContext, userData, preferences, teamData] = await Promise.all([
          getFootyShareContext(),
          fetchFanUserData(profileFid),
          getTeamPreferences(profileFid),
          fetchTeamLogos(),
        ]);

        if (cancelled) {
          return;
        }

        setIsShareEntry(shareContext.entry === "cast_share");
        setIsMiniApp(shareContext.isMiniApp);
        setFavoriteTeamIds(preferences ?? []);
        setTeams(teamData);
        setTargetUser({
          fid: profileFid,
          username:
            userData.USER_DATA_TYPE_USERNAME?.[0] ||
            inviteUsername ||
            `fid${profileFid}`,
          pfp: userData.USER_DATA_TYPE_PFP?.[0] || "/512.png",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [inviteUsername, profileFid]);

  const summary = useMemo(() => summarizePreferences(favoriteTeamIds), [favoriteTeamIds]);
  const teamLookup = useMemo(
    () =>
      new Map(teams.map((team) => [`${team.league}-${team.abbreviation}`, team])),
    [teams]
  );

  const primaryClub = summary.primaryClubId ? teamLookup.get(summary.primaryClubId) ?? null : null;
  const primaryCountry = summary.primaryCountryId ? teamLookup.get(summary.primaryCountryId) ?? null : null;

  const inviteMode: InviteMode = !summary.hasClub && !summary.hasCountry
    ? "join_footy"
    : !summary.hasClub
      ? "pick_club"
      : !summary.hasCountry
        ? "pick_country"
        : "already_active";

  const headline =
    inviteMode === "join_footy"
      ? "Get them into Footy before the World Cup noise hits."
      : inviteMode === "pick_club"
        ? "They have a country. They still need a club badge."
        : inviteMode === "pick_country"
          ? "They have a badge. They still need a country to ride with."
          : "They are already in. Use this to spark rivalry, not onboarding.";

  const supportCopy =
    inviteMode === "already_active"
      ? "This share entry is still valuable, but the message should lean into comparison and bragging rights."
      : "The right move here is a public nudge with one clear ask: choose an identity and join Footy.";

  const defaultMessage =
    inviteMode === "join_footy"
      ? "join me on Footy and pick your club and country before the World Cup gets moving."
      : inviteMode === "pick_club"
        ? "you need a proper club badge on Footy before the World Cup starts eating the timeline."
        : inviteMode === "pick_country"
          ? "you need a country on Footy for the World Cup run. Pick one and get in."
          : "you are already in Footy. Come compare badges and countries with me.";

  const appOrigin = BASE_URL || "https://fc-footy.vercel.app";
  const launchUrl = `${appOrigin}/`;
  const imageUrl = `${appOrigin}/og.png`;

  if (loading) {
    return <div className="p-6 text-center text-lightPurple">Preparing invite flow...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-deepPink/20 bg-[linear-gradient(135deg,rgba(33,19,50,0.96),rgba(7,9,20,0.98))] p-5">
        <div className="app-eyebrow mb-2">Shared Cast Invite</div>
        <h2 className="text-[30px] font-semibold leading-[1.02] text-notWhite">{headline}</h2>
        <p className="mt-3 max-w-[42rem] text-sm text-lightPurple">{supportCopy}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-limeGreenOpacity/25 px-3 py-1 text-lightPurple">
            {isMiniApp ? "Miniapp client" : "Standalone"}
          </span>
          <span className="rounded-full border border-limeGreenOpacity/25 px-3 py-1 text-lightPurple">
            {isShareEntry ? "Cast share entry" : "Direct entry"}
          </span>
          {viewerFid ? (
            <span className="rounded-full border border-limeGreenOpacity/25 px-3 py-1 text-lightPurple">
              Viewer FID {viewerFid}
            </span>
          ) : null}
        </div>
      </div>

      <InviteTargetCard
        user={targetUser}
        favoriteTeams={favoriteTeamIds}
        primaryClub={primaryClub ? { id: summary.primaryClubId!, name: primaryClub.name, logoUrl: primaryClub.logoUrl } : null}
        primaryCountry={primaryCountry ? { id: summary.primaryCountryId!, name: primaryCountry.name, logoUrl: primaryCountry.logoUrl } : null}
      />

      {isMiniApp && isShareEntry ? (
        <InviteCastComposer
          target={targetUser}
          launchUrl={launchUrl}
          imageUrl={imageUrl}
          defaultMessage={defaultMessage}
        />
      ) : (
        <div className="rounded-[24px] border border-limeGreenOpacity/20 bg-darkPurple/80 p-4 text-sm text-lightPurple">
          Invite casting is only enabled when Footy is opened from a client share into the miniapp. The profile context is still loaded here, but the public invite composer stays hidden outside that path.
        </div>
      )}
    </div>
  );
}
