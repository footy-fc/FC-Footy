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

type LookupMode = "no_identity" | "club_only" | "country_only" | "fully_badged";

export function FanClubInviteExperience({
  viewerFid,
  profileFid,
  castHash,
  inviteUsername,
}: FanClubInviteExperienceProps) {
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<{ fid: number; username?: string; pfp?: string }>({ fid: profileFid });
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>([]);
  const [viewerFavoriteTeamIds, setViewerFavoriteTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isShareEntry, setIsShareEntry] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [shareContext, userData, preferences, viewerPreferences, teamData] = await Promise.all([
          getFootyShareContext(),
          fetchFanUserData(profileFid),
          getTeamPreferences(profileFid),
          viewerFid ? getTeamPreferences(viewerFid) : Promise.resolve<string[] | null>(null),
          fetchTeamLogos(),
        ]);

        if (cancelled) {
          return;
        }

        setIsShareEntry(shareContext.entry === "cast_share");
        setIsMiniApp(shareContext.isMiniApp);
        setFavoriteTeamIds(preferences ?? []);
        setViewerFavoriteTeamIds(viewerPreferences ?? []);
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
  }, [inviteUsername, profileFid, viewerFid]);

  const summary = useMemo(() => summarizePreferences(favoriteTeamIds), [favoriteTeamIds]);
  const teamLookup = useMemo(
    () =>
      new Map(teams.map((team) => [`${team.league}-${team.abbreviation}`, team])),
    [teams]
  );

  const primaryClub = summary.primaryClubId ? teamLookup.get(summary.primaryClubId) ?? null : null;
  const primaryCountry = summary.primaryCountryId ? teamLookup.get(summary.primaryCountryId) ?? null : null;
  const viewerSummary = useMemo(() => summarizePreferences(viewerFavoriteTeamIds), [viewerFavoriteTeamIds]);
  const viewerPrimaryClub = viewerSummary.primaryClubId ? teamLookup.get(viewerSummary.primaryClubId) ?? null : null;

  const lookupMode: LookupMode = !summary.hasClub && !summary.hasCountry
    ? "no_identity"
    : !summary.hasClub
      ? "country_only"
    : !summary.hasCountry
      ? "club_only"
      : "fully_badged";

  const headline =
    lookupMode === "no_identity"
      ? "No badge. No country. Maximum banter window."
      : lookupMode === "country_only"
        ? "Country found. Club badge missing."
        : lookupMode === "club_only"
          ? "Badge found. Country still absent."
          : viewerPrimaryClub && primaryClub?.name === viewerPrimaryClub.name
            ? "Same badge. Choose respect or civil war."
            : "Badge found. Time to compare allegiances.";

  const supportCopy =
    lookupMode === "fully_badged"
      ? "Open the caster, clock the badge, then decide whether this is respect, rivalry, or a little unnecessary heat."
      : "This flow is lookup first. If they have no proper Footy identity yet, the banter should land on that, not on generic onboarding copy.";

  const banterSuggestions = useMemo(() => {
    const rivalClubName = viewerPrimaryClub?.name;
    const targetClubName = primaryClub?.name;

    if (lookupMode === "no_identity") {
      return [
        "no badge in Footy? headloss. pick a club before kickoff next time.",
        "you are posting football takes with no badge on record. nasty work.",
        "no favs in Footy yet? that is bench behavior.",
      ];
    }

    if (lookupMode === "country_only") {
      return [
        `proper commitment to ${primaryCountry?.name}, but still no club badge? explain yourself.`,
        `country on lock, club badge missing. this is half-time effort.`,
        `you have ${primaryCountry?.name} but no club badge in Footy. sort it out.`,
      ];
    }

    if (lookupMode === "club_only") {
      return [
        `${targetClubName} badge found. country still missing. international window has cooked you.`,
        `${targetClubName} in the club slot and nothing in the country slot. suspicious work.`,
        `club badge yes, country no. you are dodging the big stage.`,
      ];
    }

    if (rivalClubName && targetClubName && rivalClubName === targetClubName) {
      return [
        `${targetClubName} on your badge too? fair enough. standards still apply though.`,
        `another ${targetClubName} badge in the wild. keep the levels high.`,
        `${targetClubName} gang. now back the talk with results.`,
      ];
    }

    return [
      `${targetClubName} on the badge? bold decision.`,
      `${targetClubName} badge spotted. I need answers.`,
      `so you actually chose ${targetClubName}. respect the honesty.`,
    ];
  }, [lookupMode, primaryClub?.name, primaryCountry?.name, viewerPrimaryClub?.name]);

  const defaultMessage = banterSuggestions[0] || "explain your badge choices.";

  const appOrigin = BASE_URL || "https://fc-footy.vercel.app";
  const launchUrl = `${appOrigin}/`;
  const imageUrl = `${appOrigin}/og.png`;

  if (loading) {
    return <div className="p-6 text-center text-lightPurple">Loading badge lookup...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[24px] border border-deepPink/20 bg-[radial-gradient(circle_at_top_left,rgba(255,0,102,0.18),transparent_30%),linear-gradient(135deg,rgba(33,19,50,0.96),rgba(7,9,20,0.98))] p-5">
        <div className="app-eyebrow mb-2">Shared Cast Lookup</div>
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
          suggestions={banterSuggestions}
        />
      ) : (
        <div className="rounded-[24px] border border-limeGreenOpacity/20 bg-darkPurple/80 p-4 text-sm text-lightPurple">
          Badge lookup still works here, but public banter casting is only enabled when Footy opens inside a client share flow.
        </div>
      )}
    </div>
  );
}
