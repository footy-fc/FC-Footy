import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface GameTabNavigationProps {
  selectedTab?: string;
}

const GameTabNavigation: React.FC<GameTabNavigationProps> = ({ selectedTab = 'scoreSquare' }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Define the tabs for game type navigation
  const tabs: Array<{ id: string; label: string; path: string }> = [
    // { id: 'scoreSquare', label: 'Score Square', path: '/?tab=moneyGames&gameType=scoreSquare' },
  ];
  
  // Handle tab change
  const handleTabChange = (tabId: string, path: string) => {
    // Preserve any existing query parameters when navigating
    const currentParams = new URLSearchParams(searchParams?.toString());
    
    // If the path already has query parameters, merge them
    if (path.includes('?')) {
      const [basePath, queryString] = path.split('?');
      const newParams = new URLSearchParams(queryString);
      
      // Merge the parameters
      for (const [key, value] of newParams.entries()) {
        currentParams.set(key, value);
      }
      
      // Navigate to the base path with merged parameters
      router.push(`${basePath}?${currentParams.toString()}`);
    } else {
      // Navigate to the path with existing parameters
      const queryString = currentParams.toString();
      router.push(queryString ? `${path}?${queryString}` : path);
    }
  };
  
  return (
    <div className="ml-4 flex overflow-x-auto space-x-4 mb-4 sticky top-0 z-12 bg-darkPurple">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => handleTabChange(tab.id, tab.path)}
          className={`flex-shrink-0 py-1 px-6 text-sm font-semibold cursor-pointer rounded-full border-2 ${
            selectedTab === tab.id
              ? "border-limeGreenOpacity text-lightPurple"
              : "border-gray-500 text-gray-500"
          }`}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
};

export default GameTabNavigation; 