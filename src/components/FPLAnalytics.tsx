'use client';

import React, { useState } from 'react';
import FPLScatterplot from './FPLScatterplot';
import FPLManagersScatter from './FPLManagersScatter';
import FPLManagersChipsScatter from './FPLManagersChipsScatter';
import LeaguesDropdown from './LeaguesDropdown';

type ViewId = 'players' | 'managers' | 'managersChips';

const FPLAnalytics: React.FC = () => {
  const [view, setView] = useState<ViewId>('players');

  const options = [
    { name: 'Player Value Analysis', sportId: 'players', url: '' },
    { name: 'Managers: Transfers vs GW Points', sportId: 'managers', url: '' },
    { name: 'Managers: 3xC vs Free Transfers', sportId: 'managersChips', url: '' }
  ];

  return (
    <div>
      <div className="mb-3">
        <LeaguesDropdown
          sports={options}
          selectedLeague={view}
          onLeagueSelect={(id) => setView(id as ViewId)}
        />
      </div>
      {view === 'players' && <FPLScatterplot />}
      {view === 'managers' && <FPLManagersScatter />}
      {view === 'managersChips' && <FPLManagersChipsScatter />}
    </div>
  );
};

export default FPLAnalytics;
