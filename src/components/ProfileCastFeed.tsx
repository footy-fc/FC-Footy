"use client";

import React from "react";
import BadgedProfileAvatar from "./BadgedProfileAvatar";
import { getTeamPreferences } from "../lib/kvPerferences";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

type Team = {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
};

type ProtocolCast = {
  hash: string;
  text?: string;
  timestamp?: string;
  author?: {
    fid: number;
    username?: string;
    display_name?: string;
    pfp_url?: string;
  };
  embeds?: Array<{
    url?: string;
  }>;
  parent_hash?: string | null;
  parent_url?: string | null;
  replies?: {
    count?: number;
  };
  reactions?: {
    likes_count?: number;
    recasts_count?: number;
  };
};

function formatTimestamp(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

const statNumber = (value?: number) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const ProfileCastFeed: React.FC = () => {
  const { fid } = useFootyFarcaster();
  const [casts, setCasts] = React.useState<ProtocolCast[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [favoriteTeamId, setFavoriteTeamId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadIdentity = async () => {
      if (!fid) {
        setTeams([]);
        setFavoriteTeamId(null);
        return;
      }

      try {
        const [teamData, preferences] = await Promise.all([
          fetchTeamLogos(),
          getTeamPreferences(fid),
        ]);

        if (!cancelled) {
          setTeams(teamData);
          setFavoriteTeamId(preferences?.[0] ?? null);
        }
      } catch {
        if (!cancelled) {
          setTeams([]);
          setFavoriteTeamId(null);
        }
      }
    };

    void loadIdentity();

    return () => {
      cancelled = true;
    };
  }, [fid]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!fid) {
        setCasts([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/farcaster/feed/user-casts?fid=${fid}&limit=15`, {
          method: "GET",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          casts?: ProtocolCast[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Could not load Farcaster casts.");
        }

        if (!cancelled) {
          setCasts(Array.isArray(payload.casts) ? payload.casts : []);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setCasts([]);
          setError(nextError instanceof Error ? nextError.message : "Could not load Farcaster casts.");
        }
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
  }, [fid]);

  const favoriteTeam = favoriteTeamId
    ? teams.find((team) => getTeamId(team) === favoriteTeamId) ?? null
    : null;

  return (
    <div className="mt-4 rounded-[26px] border border-limeGreenOpacity/20 bg-[linear-gradient(180deg,rgba(25,18,40,0.96),rgba(7,9,20,0.98))] p-4 text-lightPurple shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="app-eyebrow mb-2">Farcaster Feed</div>
      <h3 className="text-xl font-semibold text-notWhite">Recent casts</h3>
      <p className="mt-1 text-sm text-lightPurple/75">
        Live from the protocol, not from Footy storage.
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-lightPurple">Loading recent casts...</p>
      ) : error ? (
        <p className="mt-3 text-sm text-[#fea282]">{error}</p>
      ) : casts.length === 0 ? (
        <p className="mt-3 text-sm text-lightPurple">No recent casts found for this FID.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {casts.map((cast) => {
            const authorName = cast.author?.display_name || cast.author?.username || "Footy supporter";
            const authorUsername = cast.author?.username;
            const embedUrl = cast.embeds?.find((embed) => typeof embed.url === "string" && embed.url.trim().length > 0)?.url;

            return (
              <article
                key={cast.hash}
                className="overflow-hidden rounded-[24px] border border-limeGreenOpacity/15 bg-[linear-gradient(180deg,rgba(24,18,40,0.98),rgba(14,13,30,0.96))] shadow-[0_12px_30px_rgba(0,0,0,0.24)]"
              >
                <div className="h-[3px] w-full bg-[linear-gradient(90deg,rgba(255,0,102,0.8),rgba(173,255,47,0.65),rgba(254,162,130,0.9))]" />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <BadgedProfileAvatar
                        pfpUrl={cast.author?.pfp_url}
                        alt={authorUsername || "Profile"}
                        badgeLogoUrl={favoriteTeam?.logoUrl}
                        badgeAlt={favoriteTeam?.name}
                        sizeClassName="h-11 w-11"
                        badgeSize={14}
                        className="rounded-full border border-limeGreenOpacity/20 bg-darkPurple"
                        fallbackClassName="text-lightPurple"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate text-[15px] font-semibold text-notWhite">{authorName}</h4>
                          <span className="rounded-full bg-darkPurple/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-lightPurple/70">
                            Cast
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-lightPurple/70">
                          {authorUsername ? <span>@{authorUsername}</span> : null}
                          {authorUsername ? <span>•</span> : null}
                          <span>{formatTimestamp(cast.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://warpcast.com/~/conversations/${cast.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-full border border-limeGreenOpacity/20 bg-darkPurple/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-notWhite transition-colors hover:border-limeGreenOpacity/40 hover:bg-darkPurple"
                    >
                      Open
                    </a>
                  </div>

                  <div className="mt-4 rounded-[20px] bg-black/18 px-4 py-4">
                    <p className="whitespace-pre-wrap text-[17px] leading-[1.55] text-[#ffb194]">
                      {cast.text?.trim() || "No cast text recorded."}
                    </p>
                    {embedUrl ? (
                      <div className="mt-4 inline-flex max-w-full rounded-[16px] border border-lightPurple/10 bg-darkPurple/70 px-3 py-2 text-xs text-lightPurple/80">
                        <span className="truncate">{embedUrl}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center gap-4 border-t border-lightPurple/10 pt-3 text-xs text-lightPurple/70">
                    <span>{statNumber(cast.replies?.count)} replies</span>
                    <span>{statNumber(cast.reactions?.likes_count)} likes</span>
                    <span>{statNumber(cast.reactions?.recasts_count)} recasts</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProfileCastFeed;
