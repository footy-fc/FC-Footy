import React, { useState, useEffect } from 'react';
import { fetchPlayerElements } from './utils/fetchPlayerElements'; // Import the fetch function
import ScoutAttackersFwds from './ScoutAttackersFwds'; // Import the XGoals component
import ScoutAttakersMids from './ScoutAttackersMids'; // Import the ScoutAttackersMid component (example)
import ScoutDefenders from './ScoutDefenders'; // Import the ScoutDefenders component
import ScoutGoalKeepers from './ScoutGoalKeepers'; // Import goalkeepers component (example)

//import FourthComponent from './FourthComponent'; // Import the fourth component (example)

interface Players {
  photo: string;
  id: number;
  webName: string;
  teamLogo: string;
  position: string;
  xgi90: number;
  xgc90: number;
  expected_goals_per_90: number;
  expected_assists_per_90: number;
  minutes: number;
  team: string;
  element_type: number;
  saves_per_90: number;
}

const Scout: React.FC = () => {
  const [players, setPlayers] = useState<Players[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTab, setSelectedTab] = useState<string>('forwards');
  const scoutViews = [
    {
      id: 'forwards',
      label: 'Forwards',
      short: 'FWD',
      hint: 'Shots, xG, finishing',
    },
    {
      id: 'midfielders',
      label: 'Midfielders',
      short: 'MID',
      hint: 'Chance creation and xGI',
    },
    {
      id: 'defenders',
      label: 'Defenders',
      short: 'DEF',
      hint: 'Threat and clean-sheet value',
    },
    {
      id: 'goalkeepers',
      label: 'Keepers',
      short: 'GK',
      hint: 'Saves and concession rate',
    },
  ] as const;

  // Fetch player data from the API
  useEffect(() => {
    const getPlayerData = async () => {
      try {
        const data = await fetchPlayerElements();
        setPlayers(data);
        // console.log('data', data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    getPlayerData();
  }, []);

  if (loading) {
    return <div className="text-center text-black">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <>
      <div className="mb-4">
        <div className="mb-4">
          <h2 className="font-2xl text-notWhite font-bold">Fantasy Player Rankings</h2>
          <p className="mt-1 text-xs text-gray-400">
            Switch between role-based leaderboards instead of hunting through a scrolling menu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {scoutViews.map((view) => (
            <button
              key={view.id}
              onClick={() => handleTabSelect(view.id)}
              type="button"
              className={`rounded-[18px] border px-3 py-3 text-left transition-all ${
                selectedTab === view.id
                  ? 'border-deepPink bg-deepPink/20 text-notWhite shadow-[0_12px_24px_rgba(220,20,120,0.2)]'
                  : 'border-limeGreenOpacity/20 bg-darkPurple/60 text-lightPurple hover:border-limeGreenOpacity/40'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-deepPink">{view.short}</div>
              <div className="mt-1 text-sm font-semibold">{view.label}</div>
              <div className={`mt-1 text-[11px] ${selectedTab === view.id ? 'text-white/75' : 'text-gray-400'}`}>
                {view.hint}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-darkPurple/70 text-lightPurple rounded-[20px] border border-limeGreenOpacity/20 p-2">
        {selectedTab === 'forwards' && <ScoutAttackersFwds playersIn={players} />}
        {selectedTab === 'midfielders' && <ScoutAttakersMids playersIn={players} />}
        {selectedTab === 'defenders' && <ScoutDefenders playersIn={players} />}
        {selectedTab === 'goalkeepers' && <ScoutGoalKeepers playersIn={players} />}
      </div>
    </>
  );
};

export default Scout;
