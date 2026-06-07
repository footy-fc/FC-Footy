"use client";

import React from "react";
import ChannelCastFeed from "./ChannelCastFeed";

// ─── Channels tab ────────────────────────────────────────────────────────────
// Surfaces the Farcaster channel feed(s) as a top-level destination in the
// bottom navigation. Defaults to the /football channel.

const ChannelsTab: React.FC = () => {
  return (
    <div className="mb-4">
      <div className="mb-3">
        <div className="app-eyebrow mb-1">Channels</div>
        <h2 className="app-title">Football Channel</h2>
      </div>

      <ChannelCastFeed channel="football" initialLimit={20} />
    </div>
  );
};

export default ChannelsTab;
