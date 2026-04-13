import React from "react";
import ContestFCFantasy from "./ContestFCFantasy";

const FantasyTab: React.FC = () => {
  return (
    <div className="mb-4">
      <h2 className="font-2xl text-notWhite font-bold mb-2">Fantasy League</h2>
      <p className="text-sm text-lightPurple mb-4">
        The Farcaster FEPL league, mapped to real Farcaster profiles so the table feels social instead of anonymous.
      </p>
      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        <ContestFCFantasy />
      </div>
    </div>
  );
};

export default FantasyTab;
