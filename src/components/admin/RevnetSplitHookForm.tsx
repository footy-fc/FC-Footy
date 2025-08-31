"use client";
import React, { useState } from "react";

const RevnetSplitHookForm: React.FC = () => {
  const [projectId, setProjectId] = useState<string>("");
  const [beneficiary, setBeneficiary] = useState<string>("");
  const [percentBps, setPercentBps] = useState<string>("10000");
  const [preferAddToBalance, setPreferAddToBalance] = useState<boolean>(false);
  const [preferClaimed, setPreferClaimed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [responseMsg, setResponseMsg] = useState<string>("");

  const onSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setResponseMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/revnet/split-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "" },
        body: JSON.stringify({ projectId, beneficiary, percentBps, preferAddToBalance, preferClaimed }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setResponseMsg(j?.message || "✅ Split Hook created and set as split.");
      } else {
        setResponseMsg(j?.error || "❌ Failed to create or set split.");
      }
    } catch {
      setResponseMsg("❌ Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-lightPurple mb-1">Project ID</label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="e.g. 53"
            className="w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-lightPurple mb-1">Beneficiary Address</label>
          <input
            type="text"
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            placeholder="0x..."
            className="w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-lightPurple mb-1">Percent (bps)</label>
          <input
            type="number"
            min="0"
            max="10000"
            value={percentBps}
            onChange={(e) => setPercentBps(e.target.value)}
            className="w-full p-2 rounded bg-darkPurple border border-limeGreenOpacity text-lightPurple"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-lightPurple">
          <input type="checkbox" checked={preferAddToBalance} onChange={(e) => setPreferAddToBalance(e.target.checked)} />
          Prefer addToBalance
        </label>
        <label className="flex items-center gap-2 text-sm text-lightPurple">
          <input type="checkbox" checked={preferClaimed} onChange={(e) => setPreferClaimed(e.target.checked)} />
          Prefer claimed tokens
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded bg-deepPink text-white hover:bg-fontRed ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Working…' : 'Create Split Hook + Set Split'}
        </button>
        {responseMsg && <span className="text-sm text-lightPurple">{responseMsg}</span>}
      </div>

      <div className="text-xs text-gray-400">
        Note: This uses an admin API route to execute the hook creation and set the split on-chain.
      </div>
    </form>
  );
};

export default RevnetSplitHookForm;
