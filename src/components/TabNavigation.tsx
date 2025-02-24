// components/TabNavigation.tsx
import React from 'react';

interface TabNavigationProps {
  selectedTab: string;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
  selectedLeague: string;
  setSelectedLeague: (league: string) => void;
  tabDisplayMap: Record<string, string>;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  selectedTab,
  setSelectedTab,
  tabDisplayMap,
}) => {
  // Use keys without spaces here
  const tabs = ["matches", "contests", "scoutPlayers", "extraTime", "settings"];

  return (
    <div className="ml-4 flex overflow-x-auto space-x-4 mb-4 sticky top-0 z-12 bg-darkPurple">
      {tabs.map((tab) => (
        <div
          key={tab}
          onClick={() => {
            window.scrollTo(0, 0);
            setSelectedTab(tab);
          }}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === tab
              ? "border-limeGreenOpacity text-lightPurple"
              : "border-gray-500 text-gray-500"
          }`}
        >
          {tabDisplayMap[tab] || (tab.charAt(0).toUpperCase() + tab.slice(1))}
        </div>
      ))}
    </div>
  );
};

export default TabNavigation;
