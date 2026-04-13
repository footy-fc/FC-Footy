import React from "react";
import ForYouWhosPlaying from "./ForYouWhosPlaying";

interface HomeTabProps {
  onNavigate: (tab: string) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ onNavigate }) => {
  return (
    <div className="mb-4">
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Home</div>
        <h2 className="app-title">Football, built around your fandom</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => onNavigate("fanClubs")}
          className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
        >
          <div className="app-card-title mb-1">Fan Clubs</div>
          <div className="app-micro">Pick favorites and see fellow fans.</div>
        </button>
        <button
          onClick={() => onNavigate("fantasy")}
          className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
        >
          <div className="app-card-title mb-1">Fantasy</div>
          <div className="app-micro">Farcaster FEPL standings and profiles.</div>
        </button>
        <button
          onClick={() => onNavigate("tools")}
          className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
        >
          <div className="app-card-title mb-1">Tools</div>
          <div className="app-micro">Value charts and weekly decisions.</div>
        </button>
      </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        <h3 className="app-section-title mb-2 px-2">Your Club Matches</h3>
        <ForYouWhosPlaying suppressFtue={false} suppressAffordances={false} />
      </div>
    </div>
  );
};

export default HomeTab;
