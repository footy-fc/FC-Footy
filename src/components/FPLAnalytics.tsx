'use client';

import React, { useState } from 'react';
import FPLScatterplot from './FPLScatterplot';
import FPLManagersScatter from './FPLManagersScatter';
import FPLManagersChipsScatter from './FPLManagersChipsScatter';

type ViewId = 'players' | 'managers' | 'managersChips';

const FPLAnalytics: React.FC = () => {
  const [view, setView] = useState<ViewId>('players');

  const options = [
    {
      name: 'Player Value',
      sportId: 'players',
      description: 'Price versus output for shortlist decisions',
    },
    {
      name: 'Transfers',
      sportId: 'managers',
      description: 'How transfer volume maps to weekly scoring',
    },
    {
      name: 'Chips',
      sportId: 'managersChips',
      description: 'Captaincy and free transfer usage',
    }
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-2">
        {options.map((option) => {
          const isSelected = view === option.sportId;
          return (
            <button
              key={option.sportId}
              type="button"
              onClick={() => setView(option.sportId as ViewId)}
              className={`rounded-[18px] border px-4 py-3 text-left transition-all ${
                isSelected
                  ? 'border-deepPink bg-deepPink/20 text-notWhite'
                  : 'border-limeGreenOpacity/20 bg-darkPurple/60 text-lightPurple hover:border-limeGreenOpacity/40'
              }`}
            >
              <div className="text-sm font-semibold">{option.name}</div>
              <div className={`mt-1 text-[11px] ${isSelected ? 'text-white/75' : 'text-gray-400'}`}>
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
      {view === 'players' && <FPLScatterplot />}
      {view === 'managers' && <FPLManagersScatter />}
      {view === 'managersChips' && <FPLManagersChipsScatter />}
    </div>
  );
};

export default FPLAnalytics;
