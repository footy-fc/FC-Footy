"use client";

import React from "react";
import HighlightsFeed from "./HighlightsFeed";

const HighlightsTab: React.FC = () => {
  return (
    <div className="-mx-3 -my-3 h-[calc(100vh-210px)] min-h-[600px] overflow-hidden rounded-[28px] bg-black">
      <HighlightsFeed />
    </div>
  );
};

export default HighlightsTab;
