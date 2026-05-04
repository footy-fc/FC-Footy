"use client";

import React from "react";
import SocialCastFeed from "~/components/social/SocialCastFeed";
import type { SocialFeedCast } from "~/components/social/types";
import { getTeamPreferences } from "../lib/kvPerferences";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

type Team = {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
};

const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

const ProfileCastFeed: React.FC = () => {
  const { fid } = useFootyFarcaster();
  const [casts, setCasts] = React.useState<SocialFeedCast[]>([]);
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
          casts?: SocialFeedCast[];
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
    <SocialCastFeed
      eyebrow="Farcaster Feed"
      title="Your Footy casts"
      loading={loading}
      error={error}
      emptyMessage="No recent casts found for this FID."
      casts={casts}
      badgeLogoUrl={favoriteTeam?.logoUrl}
      badgeAlt={favoriteTeam?.name}
    />
  );
};

export default ProfileCastFeed;
