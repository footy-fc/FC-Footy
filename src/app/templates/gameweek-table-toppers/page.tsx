'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { fetchUsersByFids } from '~/lib/hypersnap';

interface Manager {
  username: string;
  entry: number;
  total: number;
  event_total?: number;
  team_name?: string;
}

interface TemplateData {
  top5: Manager[];
  bottom5: Manager[];
  gameWeek: number;
}

const GameWeekTableToppersContent = () => {
  const searchParams = useSearchParams();
  const [data, setData] = useState<TemplateData | null>(null);
  const [profilePictures, setProfilePictures] = useState<{ [username: string]: string }>({});

  useEffect(() => {
    // Get data from URL params
    const top5Param = searchParams.get('top5');
    const bottom5Param = searchParams.get('bottom5');
    const gameWeekParam = searchParams.get('gameWeek');

    if (top5Param && bottom5Param && gameWeekParam) {
      try {
        const templateData: TemplateData = {
          top5: JSON.parse(decodeURIComponent(top5Param)),
          bottom5: JSON.parse(decodeURIComponent(bottom5Param)),
          gameWeek: parseInt(gameWeekParam)
        };
        setData(templateData);
        
        // Fetch profile pictures
        fetchProfilePictures([...templateData.top5, ...templateData.bottom5]);
      } catch (error) {
        console.error('Error parsing template data:', error);
      }
    }
  }, [searchParams]);

  const fetchProfilePictures = async (managers: Manager[]) => {
    const pfpMap: { [username: string]: string } = {};
    
    // Import the fantasy managers lookup
    try {
      const fantasyManagersLookup = await import('../../../data/fantasy-managers-lookup.json');
      
      const fids = managers
        .map((manager) =>
          fantasyManagersLookup.default.find(
            (entry: { entry_id: number; fid?: number }) => entry.entry_id === manager.entry
          )?.fid
        )
        .filter((fid): fid is number => Number.isInteger(fid));
      const users = await fetchUsersByFids(fids);
      const fidToPfp = new Map(users.map((user) => [user.fid, user.pfp_url || '']));

      for (const manager of managers) {
        // Find FID for this manager
        const lookupEntry = fantasyManagersLookup.default.find(
          (entry: { entry_id: number; fid?: number }) => entry.entry_id === manager.entry
        );
        
        if (lookupEntry?.fid) {
          const pfp = fidToPfp.get(lookupEntry.fid);
          if (pfp) {
            pfpMap[manager.username] = pfp;
          }
        }
        
        // Fallback if no PFP found
        if (!pfpMap[manager.username]) {
          pfpMap[manager.username] = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format';
        }
      }
      
      setProfilePictures(pfpMap);
    } catch (error) {
      console.error('Error loading fantasy managers lookup:', error);
    }
  };

  if (!data) {
    return (
      <div 
        id="gameweek-template"
        className="w-[1000px] h-[600px] flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white"
      >
        <div className="text-xl">Loading template...</div>
      </div>
    );
  }

  return (
    <div 
      id="gameweek-template"
      className="w-[1000px] h-[600px] bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white font-sans relative overflow-hidden"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Title */}
      <div className="text-center pt-4">
        <h1 className="text-4xl font-bold text-notWhite">
          Game Week {data.gameWeek} Table Toppers
        </h1>
      </div>

      {/* Center Text - FC FEPL */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-6xl font-bold text-white opacity-20 transform -rotate-12">
          FC FEPL
        </div>
        <Image src="/banny_redcard.png" alt="FC FEPL" width={100} height={100} />
      </div>
      {/* Left Column - Top 5 */}
      <div className="absolute left-12 top-24">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-notWhite mb-4 flex items-center">
            🏆 WINNERS
          </h2>
          <h3 className="text-xl font-bold text-lightPurple mb-4">Top 5:</h3>
        </div>

        <div className="space-y-2">
          {data.top5.map((manager) => (
            <div key={manager.username} className="flex items-center space-x-4">
              {/* Profile Picture */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                <img
                  src={profilePictures[manager.username] || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format'}
                  alt={manager.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format';
                  }}
                />
              </div>

              {/* Manager Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg font-bold">🥇</span>
                  <span className="text-lg font-bold" style={{ color: '#FEA282' }}>
                    @{manager.username}
                  </span>
                </div>
                <div className="text-sm text-gray-300">
                  {manager.team_name || manager.username}
                </div>
                <div className="text-sm font-bold text-white">
                  Points: {manager.total}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - Bottom 5 */}
      <div className="absolute right-12 top-24">
        {/* Upside down "WINNERS" text */}
        <div className="mb-6">
          <div className="transform rotate-180 text-center">
            <h2 className="text-2xl font-bold text-notWhite flex items-center justify-center">
              🏆 WINNERS
            </h2>
          </div>
          <h3 className="text-xl font-bold text-lightPurple mt-4">Bottom 5:</h3>
        </div>

        <div className="space-y-2">
          {data.bottom5.map((manager) => (
            <div key={manager.username} className="flex items-center space-x-4">
              {/* Profile Picture */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                <img
                  src={profilePictures[manager.username] || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format'}
                  alt={manager.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format';
                  }}
                />
              </div>

              {/* Manager Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg font-bold">😅</span>
                  <span className="text-lg font-bold" style={{ color: '#FEA282' }}>
                    @{manager.username}
                  </span>
                </div>
                <div className="text-sm text-gray-300">
                  {manager.team_name || manager.username}
                </div>
                <div className="text-sm font-bold text-lightPurple">
                  Points: {manager.total}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const GameWeekTableToppersTemplate = () => {
  return (
    <Suspense fallback={
      <div 
        id="gameweek-template"
        className="w-[1000px] h-[600px] flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white"
      >
        <div className="text-xl">Loading template...</div>
      </div>
    }>
      <GameWeekTableToppersContent />
    </Suspense>
  );
};

export default GameWeekTableToppersTemplate;
