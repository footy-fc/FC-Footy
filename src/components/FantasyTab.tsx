import React from "react";
import ContestFCFantasy from "./ContestFCFantasy";

const FantasyTab: React.FC = () => {
  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Fantasy</div>
      <h2 className="app-title mb-2">The social FEPL table</h2>
      <p className="app-copy mb-4">
        The Farcaster FEPL league, mapped to real Farcaster profiles so the table feels social instead of anonymous.
      </p>
      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        <ContestFCFantasy />
      </div>
    </div>
  );
};

export default FantasyTab;
