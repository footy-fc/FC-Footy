"use client";

import React from "react";
import Image from "next/image";
import { Bell, Check, ChevronLeft, ChevronRight, Mail, Settings, X } from "lucide-react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";
import { getTeamPreferences } from "~/lib/kvPerferences";
import {
  getPrimaryClubPreference,
  TEAM_PREFERENCES_UPDATED_EVENT,
} from "~/lib/teamPreferenceModel";
import FinalWhistleNewsletterPreference from "./FinalWhistleNewsletterPreference";
import SettingsFollowClubs from "./SettingsFollowClubs";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";

interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface UpdatesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  viewerFid?: number;
}

type DetailPanel = "teams" | "newsletter" | null;

type NewsletterPreferencePayload = {
  preference?: {
    email: string;
    subscribed: boolean;
  } | null;
};

const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

const getSafeMiniAppContext = async () => {
  try {
    await sdk.actions.ready();
    return (await sdk.context) ?? null;
  } catch {
    return null;
  }
};

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  return `${localPart.slice(0, 1)}${"•".repeat(Math.max(5, localPart.length - 1))}@${domain}`;
};

export default function UpdatesSheet({ isOpen, onClose, viewerFid }: UpdatesSheetProps) {
  const { getAuthorizationHeaders } = useFootyFarcaster();
  const [detailPanel, setDetailPanel] = React.useState<DetailPanel>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [teamIds, setTeamIds] = React.useState<string[]>([]);
  const [newsletterEmail, setNewsletterEmail] = React.useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = React.useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(true);
  const [permissionMessage, setPermissionMessage] = React.useState<string | null>(null);

  const loadSummary = React.useCallback(async () => {
    if (!isOpen) return;
    setIsLoadingSummary(true);

    try {
      const context = viewerFid ? null : await getSafeMiniAppContext();
      const fid = viewerFid ?? context?.user?.fid;
      const [teamData, preferences] = await Promise.all([
        fetchTeamLogos(),
        fid ? getTeamPreferences(fid) : Promise.resolve<string[] | null>(null),
      ]);
      setTeams(teamData);
      setTeamIds(preferences ?? []);
    } catch {
      setTeams([]);
      setTeamIds([]);
    }

    try {
      const headers = await getAuthorizationHeaders();
      const response = await fetch("/api/profile/newsletter", {
        headers,
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as NewsletterPreferencePayload;
      if (response.ok) {
        setNewsletterEmail(payload.preference?.email ?? "");
        setNewsletterSubscribed(payload.preference?.subscribed ?? false);
      }
    } catch {
      setNewsletterEmail("");
      setNewsletterSubscribed(false);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [getAuthorizationHeaders, isOpen, viewerFid]);

  React.useEffect(() => {
    if (!isOpen) {
      setDetailPanel(null);
      setPermissionMessage(null);
      return;
    }

    void loadSummary();
    const handlePreferencesUpdated = () => void loadSummary();
    window.addEventListener(TEAM_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(TEAM_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loadSummary, onClose]);

  if (!isOpen) return null;

  const primaryClubId = getPrimaryClubPreference(teamIds);
  const followedTeams = teamIds
    .map((teamId) => teams.find((team) => getTeamId(team) === teamId))
    .filter((team): team is Team => Boolean(team));
  const primaryClub = primaryClubId
    ? followedTeams.find((team) => getTeamId(team) === primaryClubId) ?? null
    : null;
  const followedLabel = primaryClub
    ? `${primaryClub.name}${followedTeams.length > 1 ? ` + ${followedTeams.length - 1} ${followedTeams.length === 2 ? "team" : "teams"}` : ""}`
    : followedTeams.length > 0
      ? `${followedTeams.length} followed ${followedTeams.length === 1 ? "team" : "teams"}`
      : "Choose teams to follow";

  const enableNotifications = async () => {
    setPermissionMessage(null);
    try {
      await sdk.actions.ready();
      await sdk.actions.addMiniApp?.();
      setPermissionMessage("Footy notifications are ready.");
    } catch {
      setPermissionMessage("Open Footy in Farcaster to enable device notifications.");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#020617]/72 px-2" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Your updates"
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[78dvh] w-full max-w-[400px] overflow-y-auto rounded-t-[30px] border border-b-0 border-lightPurple/20 bg-[#171525] px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 text-lightPurple shadow-[0_-24px_70px_rgba(0,0,0,0.5)]"
      >
        <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-lightPurple/45" aria-hidden="true" />

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {detailPanel ? (
              <button type="button" onClick={() => setDetailPanel(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lightPurple/15 bg-darkPurple text-lightPurple" aria-label="Back to updates">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            <div>
              <h2 className="text-[25px] font-semibold leading-none text-notWhite">
                {detailPanel === "teams" ? "Match alerts" : detailPanel === "newsletter" ? "Final Whistle" : "Your updates"}
              </h2>
              {!detailPanel ? <p className="mt-1 text-xs text-lightPurple/70">Teams, match alerts and your gameweek email</p> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lightPurple/15 bg-darkPurple text-lightPurple transition-colors hover:text-notWhite" aria-label="Close updates">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {detailPanel === "teams" ? (
          <SettingsFollowClubs viewerFid={viewerFid} />
        ) : detailPanel === "newsletter" ? (
          <FinalWhistleNewsletterPreference getAuthorizationHeaders={getAuthorizationHeaders} />
        ) : (
          <div className="space-y-3">
            <button type="button" onClick={() => setDetailPanel("teams")} className="w-full rounded-[22px] border border-limeGreenOpacity/20 bg-purplePanel/75 p-4 text-left transition-colors hover:border-deepPink/30">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-deepPink/15 text-deepPink">
                  <Bell className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-notWhite">Match alerts</h3>
                    <span className="text-xs font-semibold text-deepPink">{teamIds.length > 0 ? "On" : "Set up"}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-lightPurple/70">Goals, lineups and full-time</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex shrink-0 -space-x-2">
                      {followedTeams.slice(0, 3).map((team) => (
                        <Image key={getTeamId(team)} src={team.logoUrl} alt="" width={25} height={25} className="h-[25px] w-[25px] rounded-full border-2 border-purplePanel object-contain" />
                      ))}
                    </div>
                    <span className="min-w-0 truncate text-sm text-lightPurple">{isLoadingSummary ? "Loading teams…" : followedLabel}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-lightPurple/65" aria-hidden="true" />
              </div>
            </button>

            <button type="button" onClick={() => setDetailPanel("newsletter")} className="w-full rounded-[22px] border border-limeGreenOpacity/20 bg-purplePanel/75 p-4 text-left transition-colors hover:border-deepPink/30">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-deepPink/15 text-deepPink">
                  <Mail className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-notWhite">Final Whistle</h3>
                    <span className="text-xs font-semibold text-deepPink">{newsletterSubscribed ? "Subscribed" : "Set up"}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-lightPurple/70">After every gameweek</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-lightPurple">
                    {newsletterSubscribed ? <Check className="h-4 w-4 shrink-0 text-limeGreen" aria-hidden="true" /> : null}
                    <span className="truncate">{isLoadingSummary ? "Loading preference…" : newsletterEmail ? maskEmail(newsletterEmail) : "Personalized to your FPL team"}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-lightPurple/65" aria-hidden="true" />
              </div>
            </button>

            <button type="button" onClick={() => void enableNotifications()} className="flex w-full items-center gap-3 rounded-[18px] border border-lightPurple/14 px-4 py-3 text-left text-sm font-semibold text-deepPink transition-colors hover:bg-darkPurple">
              <Settings className="h-5 w-5" aria-hidden="true" />
              <span className="flex-1">Open notification settings</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {permissionMessage ? <p role="status" className="px-1 text-xs text-lightPurple/75">{permissionMessage}</p> : null}
          </div>
        )}
      </section>
    </div>
  );
}
