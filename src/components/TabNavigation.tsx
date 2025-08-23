import React from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

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
  // Use keys without spaces here
  const tabsBase = [
    "forYou",
    "matches",
    "contests",
    // "scoutPlayers",
    // "moneyGames", // Temporarily disabled
    // "oCaptain",
    "extraTime",
    "rewards",
    "settings",
  ];
  const adminFids = React.useMemo(() => new Set<number>([4163, 420564]), []);
  const [includeAdmins, setIncludeAdmins] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        const fid = context?.user?.fid;
        if (!cancelled) setIncludeAdmins(Boolean(fid && adminFids.has(fid)));
      } catch {
        if (!cancelled) setIncludeAdmins(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [adminFids]);

  const tabs = includeAdmins ? [...tabsBase, 'admins'] : tabsBase;

  return (
    <div className="flex overflow-x-auto overflow-y-hidden space-x-4 mb-1 sticky top-0 z-50 bg-darkPurple py-2 shadow-md w-full">
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