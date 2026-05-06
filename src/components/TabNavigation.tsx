import React from 'react';

interface TabNavigationProps {
  selectedTab: string;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
  tabDisplayMap: Record<string, string>;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  selectedTab,
  setSelectedTab,
  tabDisplayMap,
}) => {
  const tabs = [
    "home",
    "scores",
    "highlights",
    "fanClubs",
    "fantasy",
    "tools",
  ];
  const iconMap: Record<string, JSX.Element> = {
    home: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
    scores: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M8 12h.01M16 12h.01" />
        <path d="M11 10v4M13 10v4" />
      </svg>
    ),
    fanClubs: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.5" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M14 3.13a3.5 3.5 0 0 1 0 6.74" />
      </svg>
    ),
    fantasy: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l2.8 5.67L21 9.6l-4.5 4.38L17.6 21 12 18.02 6.4 21l1.1-7.02L3 9.6l6.2-.93L12 3z" />
      </svg>
    ),
    tools: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19h16" />
        <path d="M7 16V9" />
        <path d="M12 16V5" />
        <path d="M17 16v-3" />
      </svg>
    ),
    highlights: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3" />
        <line x1="19" y1="3" x2="19" y2="21" />
      </svg>
    ),
    admins: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
        <path d="M9.5 12l1.5 1.5 3.5-3.5" />
      </svg>
    ),
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-20px)] max-w-[380px] -translate-x-1/2 rounded-[28px] border border-limeGreenOpacity/20 bg-darkPurple/90 px-2 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="grid grid-cols-6 gap-0.5">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => {
            window.scrollTo(0, 0);
            setSelectedTab(tab);
          }}
          className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2 text-[10px] font-semibold tracking-[0.02em] transition-all ${
            selectedTab === tab
              ? "bg-gradient-to-b from-deepPink/25 to-deepPink/5 text-notWhite"
              : "text-gray-500 hover:bg-white/5 hover:text-lightPurple"
          }`}
          type="button"
        >
          <span className={`${selectedTab === tab ? "text-lightPurple" : "text-gray-500"}`}>
            {iconMap[tab]}
          </span>
          <span>{tabDisplayMap[tab] || (tab.charAt(0).toUpperCase() + tab.slice(1))}</span>
          {selectedTab === tab && <span className="absolute inset-x-4 top-0 h-[3px] rounded-full bg-deepPink" />}
        </button>
      ))}
      </div>
    </div>
  );
};

export default TabNavigation;
