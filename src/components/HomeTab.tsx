import React from "react";
import ForYouWhosPlaying from "./ForYouWhosPlaying";

interface HomeTabProps {
  onNavigate: (tab: string) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ onNavigate }) => {
  return (
    <div className="mb-4">
      <div className="mb-4">
        <h2 className="font-2xl text-notWhite font-bold mb-2">Football, built around your fandom</h2>
        <p className="text-sm text-lightPurple">
          Follow clubs, see who else backs them, track your Farcaster FEPL league, and use player stats to set your team.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => onNavigate("fanClubs")}
          className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
        >
          <div className="text-notWhite font-semibold mb-1">Fan Clubs</div>
          <div className="text-xs text-lightPurple">Pick favorites and see fellow fans.</div>
        </button>
        <button
          onClick={() => onNavigate("fantasy")}
          className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
        >
          <div className="text-notWhite font-semibold mb-1">Fantasy</div>
          <div className="text-xs text-lightPurple">Farcaster FEPL standings and profiles.</div>
        </button>
        <button
          onClick={() => onNavigate("tools")}
          className="rounded-lg border border-limeGreenOpacity bg-purplePanel p-3 text-left hover:bg-deepPink transition-colors"
        >
          <div className="text-notWhite font-semibold mb-1">Tools</div>
          <div className="text-xs text-lightPurple">Player rankings for weekly decisions.</div>
        </button>
      </div>

      <div className="bg-purplePanel text-lightPurple rounded-lg p-2 overflow-hidden">
        <h3 className="text-notWhite font-semibold mb-2 px-2">Your Club Matches</h3>
        <ForYouWhosPlaying suppressFtue={false} suppressAffordances={false} />
      </div>
    </div>
  );
};

export default HomeTab;
