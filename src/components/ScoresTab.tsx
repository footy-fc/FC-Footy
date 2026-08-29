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
        <h2 className="app-title">Match centre</h2>
        <p className="app-copy mt-2">Live scores, what&apos;s next, and the latest results.</p>
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
