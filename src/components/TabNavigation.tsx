import React from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { PRIVILEGED_FIDS } from '~/config/privileged';

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
  const adminFids = React.useMemo(() => new Set<number>(PRIVILEGED_FIDS), []);
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
    <div className="flex flex-wrap gap-3 justify-center mb-3 sticky top-0 z-50 bg-midnight/80 backdrop-blur py-2 px-2 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
      {tabs.map((tab) => {
        const isActive = selectedTab === tab;
        return (
          <button
            key={tab}
            onClick={() => {
              window.scrollTo(0, 0);
              setSelectedTab(tab);
            }}
            className={`flex-shrink-0 py-2 px-5 text-sm font-semibold cursor-pointer rounded-full border transition-all duration-200 shadow-[0_0_0_2px_rgba(231,46,119,0.08)] ${
              isActive
                ? "bg-brightPink text-white border-brightPink shadow-[0_6px_18px_rgba(231,46,119,0.35)]"
                : "bg-slateViolet border-brightPink/40 text-lightPurple hover:border-brightPink hover:text-white"
            }`}
          >
            {tabDisplayMap[tab] || (tab.charAt(0).toUpperCase() + tab.slice(1))}
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;
