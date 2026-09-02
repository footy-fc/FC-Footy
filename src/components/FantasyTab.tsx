import React from "react";
import ContestFCFantasy from "./ContestFCFantasy";

const FantasyTab: React.FC = () => {
  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Fantasy</div>
      <h2 className="app-title mb-2">League table</h2>
      <p className="app-copy mb-4">
        The full FC Fantasy standings, mapped to Farcaster.
      </p>
      <div className="overflow-hidden rounded-[20px] border border-lightPurple/12 bg-purplePanel/70 p-3 text-lightPurple">
        <ContestFCFantasy />
      </div>
    </div>
  );
};

export default FantasyTab;
