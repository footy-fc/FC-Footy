import React, { useState } from "react";
import MatchesTab from "./MatchesTab";

interface ScoresTabProps {
  onNavigate: (tab: string) => void;
}

const ScoresTab: React.FC<ScoresTabProps> = ({ onNavigate }) => {
  const [league, setLeague] = useState("eng.1");

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h2 className="font-2xl text-notWhite font-bold mb-2">Scores</h2>
        <p className="text-sm text-lightPurple">
          Track the latest results, see if your clubs are winning, and monitor matches that affect your fantasy squad.
        </p>
      </div>
      <MatchesTab
        league={league}
        setSelectedTab={onNavigate}
        setSelectedLeague={setLeague}
      />
    </div>
  );
};

export default ScoresTab;
