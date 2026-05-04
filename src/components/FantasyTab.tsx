import React from "react";
import ContestFCFantasy from "./ContestFCFantasy";

const FantasyTab: React.FC = () => {
  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Fantasy</div>
      <h2 className="app-title mb-2">League table</h2>
      <p className="app-copy mb-4">
        FC Fantasy EPL mapped to Farcaster profiles.
      </p>
      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        <ContestFCFantasy />
      </div>
    </div>
  );
};

export default FantasyTab;
