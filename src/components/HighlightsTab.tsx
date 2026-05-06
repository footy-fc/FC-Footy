"use client";

import React from "react";
import HighlightsFeed from "./HighlightsFeed";

/**
 * HighlightsTab — uses negative margins to escape the parent card's p-3 padding,
 * then fills the available viewport height. No position:fixed needed.
 */
const HighlightsTab: React.FC = () => {
  return (
    <div
      className="-m-3 bg-black overflow-hidden"
      style={{ height: "calc(100dvh - 112px)" }}
    >
      <HighlightsFeed />
    </div>
  );
};

export default HighlightsTab;
