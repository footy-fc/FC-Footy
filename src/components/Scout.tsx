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

  // State to manage the selected tab
  const [selectedTab, setSelectedTab] = useState<string>('forwards'); // Default tab 

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

  // Handlers for selecting different tabs
  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab); // Set selected tab
  };

  return (
    <>
      <div className="mb-4">
        {/* Horizontal Scrollable Menu for Tabs */}
        <h2 className="font-2xl text-notWhite font-bold mb-4">Fantasy Player Rankings</h2>
        <div className="flex overflow-x-auto space-x-4 mb-4">
          {/* Tab Buttons */}
          <button
            onClick={() => handleTabSelect('forwards')}
            className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
              selectedTab === 'forwards' ? 'text-lightPurple underline' : 'text-gray-500 hover:text-lightPurple hover:underline'
            }`}
          >
            Forwards
          </button>
          
          <button
            onClick={() => handleTabSelect('midfielders')}
            className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
              selectedTab === 'midfielders' ? 'text-lightPurple underline' : 'text-gray-500 hover:text-lightPurple hover:underline'
            }`}
          >
            Midfielders
          </button>

          <button
            onClick={() => handleTabSelect('defenders')}
            className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
              selectedTab === 'defenders' ? 'text-lightPurple underline' : 'text-gray-500 hover:text-lightPurple hover:underline'
            }`}
          >
            Defending
          </button>

          <button
            onClick={() => handleTabSelect('goalkeepers')}
            className={`flex-shrink-0 py-1 px-2 text-sm font-semibold cursor-pointer underline-offset-4 ${
              selectedTab === 'goalkeepers' ? 'text-lightPurple underline' : 'text-gray-500 hover:text-lightPurple hover:underline'
            }`}
          >
            Keepers
          </button>

        </div>
      </div>

      {/* Conditional Rendering Based on Selected Tab */}
      <div className="bg-purplePanel text-lightPurple rounded-lg">
        {selectedTab === 'forwards' && <ScoutAttackersFwds playersIn={players} />}
        {selectedTab === 'midfielders' && <ScoutAttakersMids playersIn={players} />}
        {selectedTab === 'defenders' && <ScoutDefenders playersIn={players} />}
        {selectedTab === 'goalkeepers' && <ScoutGoalKeepers playersIn={players} />} {/* Replace with actual component */}
      </div>
    </>
  );
};

export default Scout;
