"use client";

import React from "react";
import HighlightsFeed from "./HighlightsFeed";

const HighlightsTab: React.FC = () => {
  return (
    <div className="mb-4">
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Highlights</div>
        <h2 className="app-title">Recent Games</h2>
      </div>
      <HighlightsFeed />
    </div>
  );
};

export default HighlightsTab;
