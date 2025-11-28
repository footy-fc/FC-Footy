import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface GameStateNavigationProps {
  selectedState?: string;
  onStateChange: (state: string) => void;
}

/**
 * GameStateNavigation - A component for third-level navigation between game states
 * 
 * This component renders a set of tabs with a boxier style for navigating between
 * different game states: Active, Create, and Completed.
 * On mobile devices, it's fixed to the bottom of the screen for easier access.
 */
const GameStateNavigation: React.FC<GameStateNavigationProps> = ({ 
  selectedState = 'active',
  onStateChange
}) => {
  // Define the tabs for game state navigation
  const tabs: Tab[] = [
    { id: 'active', label: 'Active Games' },
    // { id: 'create', label: 'Create Game' }, // Temporarily disabled
    { id: 'completed', label: 'Completed Games' }
  ];
  
  return (
    <>
      {/* Desktop version - shown above content */}
      <div className="hidden md:block mb-5 w-full">
        <div className="flex bg-slateViolet/70 border border-brightPink/30 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-3 flex-1 text-sm font-semibold transition-all duration-200 ${
                selectedState === tab.id
                  ? 'bg-brightPink text-white shadow-[0_8px_24px_rgba(231,46,119,0.35)]'
                  : 'text-lightPurple hover:text-white hover:bg-midnight/60'
              }`}
              onClick={() => onStateChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Mobile version - fixed to bottom of screen */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-midnight/95 border-t border-brightPink/40 z-20 backdrop-blur">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 py-3 px-2 text-center ${
                selectedState === tab.id
                  ? 'text-white border-t-2 border-brightPink'
                  : 'text-gray-400'
              }`}
              onClick={() => onStateChange(tab.id)}
            >
              {/* Icons for mobile tabs */}
              <div className="flex flex-col items-center">
                <div className="mb-1">
                  {tab.id === 'active' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  )}
                  {tab.id === 'create' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  )}
                  {tab.id === 'completed' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  )}
                </div>
                <span className="text-xs">{tab.label.replace(' Games', '').replace(' Game', '')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Add padding at the bottom on mobile to prevent content from being hidden behind the fixed navigation 
      <div className="md:hidden pb-16"></div>*/}
    </>
  );
};

export default GameStateNavigation; 