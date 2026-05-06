"use client";

import React from "react";
import HighlightsFeed from "./HighlightsFeed";

/**
 * HighlightsTab — renders as a fullscreen overlay above the tab bar.
 * Escapes the normal rounded card container so videos fill the whole screen.
 */
const HighlightsTab: React.FC = () => {
  return (
    // z-40 keeps us below the tab bar (z-50) but above everything else
    <div
      className="fixed left-0 right-0 top-0 bg-black z-40"
      style={{ bottom: 88 }} // tab bar is ~88px from bottom
    >
      <HighlightsFeed />
    </div>
  );
};

export default HighlightsTab;
