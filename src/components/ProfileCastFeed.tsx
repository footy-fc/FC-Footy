"use client";

import React from "react";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

type FarcasterActionLog = {
  fid: number;
  action: "cast";
  text?: string | null;
  timestamp: string;
  result?: string | null;
  hash?: string | null;
  error?: string | null;
};

function formatTimestamp(value: string) {
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

const ProfileCastFeed: React.FC = () => {
  const { canWrite, getAuthorizationHeaders } = useFootyFarcaster();
  const [logs, setLogs] = React.useState<FarcasterActionLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!canWrite) {
        setLogs([]);
        setLoading(false);
        return;
      }

      try {
        const headers = await getAuthorizationHeaders();
        const response = await fetch("/api/farcaster/account/activity", {
          method: "GET",
          headers,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          logs?: FarcasterActionLog[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Could not load Footy casts.");
        }

        if (!cancelled) {
          setLogs(Array.isArray(payload.logs) ? payload.logs.filter((log) => log.action === "cast") : []);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setLogs([]);
          setError(nextError instanceof Error ? nextError.message : "Could not load Footy casts.");
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
  }, [canWrite, getAuthorizationHeaders]);

  return (
    <div className="mt-4 rounded-[22px] border border-limeGreenOpacity/20 bg-purplePanel p-4 text-lightPurple">
      <div className="app-eyebrow mb-2">Footy Casts</div>
      <h3 className="text-xl font-semibold text-notWhite">Posted from Footy</h3>

      {loading ? (
        <p className="mt-3 text-sm text-lightPurple">Loading cast history...</p>
      ) : error ? (
        <p className="mt-3 text-sm text-[#fea282]">{error}</p>
      ) : logs.length === 0 ? (
        <p className="mt-3 text-sm text-lightPurple">No casts sent from Footy yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {logs.map((log, index) => (
            <div
              key={`${log.timestamp}-${index}`}
              className="rounded-[18px] border border-limeGreenOpacity/15 bg-darkPurple/70 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.16em] text-lightPurple/70">
                  {log.result === "submitted" ? "Submitted" : "Attempted"}
                </div>
                <div className="text-xs text-lightPurple/70">{formatTimestamp(log.timestamp)}</div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-notWhite">
                {log.text?.trim() || "No cast text recorded."}
              </p>
              {log.hash ? (
                <a
                  href={`https://warpcast.com/~/conversations/${log.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-xs font-medium text-[#fea282] hover:text-notWhite"
                >
                  View cast
                </a>
              ) : null}
              {log.error ? <p className="mt-2 text-xs text-[#fea282]">{log.error}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileCastFeed;
