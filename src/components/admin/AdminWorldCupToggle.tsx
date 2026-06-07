"use client";

import React from "react";

// ─── Admin: World Cup mode toggle ────────────────────────────────────────────
// Flips the festive World Cup experience on/off at runtime (persisted in KV via
// /api/settings/world-cup). No redeploy needed.

const AdminWorldCupToggle: React.FC = () => {
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const getApiKey = (): string | null => {
    try {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("footy_admin_passkey");
        if (stored) return stored;
      }
    } catch {
      /* ignore */
    }
    return process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY ?? null;
  };

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/world-cup")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok) setEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load current setting");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async () => {
    if (enabled === null || saving) return;
    const next = !enabled;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/world-cup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next, apiKey: getApiKey() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setEnabled(Boolean(data.enabled));
      setMessage(`World Cup mode ${data.enabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-notWhite mb-2">World Cup Mode</h3>
        <p className="text-sm text-lightPurple">
          Turns the festive World Cup banner and fixtures section on the Home tab
          on or off for everyone. Changes apply on next load — no redeploy needed.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-limeGreenOpacity bg-darkPurple/50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <div className="font-semibold text-notWhite">
              {loading ? "Loading…" : enabled ? "World Cup mode is ON" : "World Cup mode is OFF"}
            </div>
            <div className="text-xs text-lightPurple">
              {enabled
                ? "Home shows the festive World Cup experience."
                : "Home shows the default experience."}
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={Boolean(enabled)}
          disabled={loading || saving || enabled === null}
          onClick={handleToggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-emerald-500" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-fontRed">{error}</p> : null}

      <p className="text-xs text-gray-400">
        Default when unset is controlled by <code>WORLD_CUP_MODE</code> in
        <code> src/lib/config.ts</code>.
      </p>
    </div>
  );
};

export default AdminWorldCupToggle;
