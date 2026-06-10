"use client";

import React from "react";
import ChannelCastFeed from "./ChannelCastFeed";

// ─── Channels tab ────────────────────────────────────────────────────────────
// Surfaces the Farcaster channel feed(s) as a top-level destination in the
// bottom navigation. Defaults to the /football channel.

const ChannelsTab: React.FC = () => {
  return (
    <div className="mb-4">
      <ChannelCastFeed channel="football" initialLimit={20} />
    </div>
  );
};

export default ChannelsTab;
