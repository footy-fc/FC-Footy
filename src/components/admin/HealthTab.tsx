"use client";
import { useEffect, useState } from "react";

type LeagueHealth = {
  id: string;
  label: string;
  ok: boolean;
  eventsCount?: number;
  inCount?: number;
  postCount?: number;
  preCount?: number;
  error?: string;
};

type HealthResponse = {
  success: boolean;
  timestamp: string;
  redisOk: boolean;
  leagues: LeagueHealth[];
  recentFailures?: { id: string; label: string; error: string; ts: string }[];
};

export default function HealthTab() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goal-notification/health?includeHistory=1", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-notWhite">Goal Notifications Health</h2>
        <button
          onClick={fetchHealth}
          className="px-3 py-2 rounded bg-deepPink text-white hover:bg-fontRed"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-fontRed text-fontRed bg-darkPurple">
          {error}
        </div>
      )}

      {data && (
        <div>
          <div className="mb-3 text-lightPurple text-sm">
            <span>Last updated: </span>
            <span className="text-notWhite">{new Date(data.timestamp).toLocaleString()}</span>
          </div>
          <div className="mb-6 p-3 rounded border border-limeGreenOpacity bg-purplePanel text-sm">
            <span className="mr-2">Redis:</span>
            <span className={data.redisOk ? "text-green-400" : "text-fontRed"}>
              {data.redisOk ? "OK" : "Unavailable"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.leagues.map((lg) => (
              <div key={lg.id} className="p-4 rounded-lg border border-limeGreenOpacity bg-purplePanel">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-notWhite font-medium">{lg.label}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${lg.ok ? "bg-green-500/20 text-green-400" : "bg-fontRed/20 text-fontRed"}`}>
                    {lg.ok ? "Upstream OK" : "Upstream Error"}
                  </span>
                </div>
                {lg.ok ? (
                  <div className="text-sm text-lightPurple">
                    <div>Events: <span className="text-notWhite">{lg.eventsCount}</span></div>
                    <div>Live (in): <span className="text-notWhite">{lg.inCount}</span></div>
                    <div>Completed (post): <span className="text-notWhite">{lg.postCount}</span></div>
                    <div>Pre: <span className="text-notWhite">{lg.preCount}</span></div>
                  </div>
                ) : (
                  <div className="text-sm text-fontRed break-words">{lg.error || "Unknown error"}</div>
                )}
              </div>
            ))}
          </div>

          {Array.isArray(data.recentFailures) && data.recentFailures.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-notWhite mb-3">Recent Failures</h3>
              <div className="space-y-2">
                {data.recentFailures.map((f, idx) => (
                  <div key={idx} className="p-3 rounded border border-fontRed/40 bg-fontRed/10 text-sm">
                    <div className="flex flex-wrap justify-between">
                      <span className="font-medium text-notWhite">{f.label}</span>
                      <span className="text-lightPurple">{new Date(f.ts).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-fontRed break-words">{f.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
