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
        <div className="app-eyebrow mb-2">Scores</div>
        <h2 className="app-title">Live now</h2>
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
