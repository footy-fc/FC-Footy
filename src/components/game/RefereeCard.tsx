/* eslint-disable */

'use client';

import React, { useState, useEffect } from 'react';
import { sdk as frameSdk, sdk } from "@farcaster/miniapp-sdk";
import FarcasterAvatar from '../FarcasterAvatar';
import { formatAddress } from '../../utils/formatters';
import { fetchFarcasterProfileByAddress } from '../../utils/fetchFarcasterProfile';

interface RefereeCardProps {
  referee: string;
}

const RefereeCard: React.FC<RefereeCardProps> = ({ referee }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [fid, setFid] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFrameContext, setIsFrameContext] = useState<boolean>(false);

  useEffect(() => {
    const fetchFarcasterProfile = async () => {
      if (!referee) return;

      try {
        setLoading(true);
        const profile = await fetchFarcasterProfileByAddress(referee);
        
        if (profile?.username) {
          setUsername(profile.username);
          setFid(profile.fid || null);
        } else {
          setUsername(null);
          setFid(null);
        }
      } catch (error) {
        console.error('Error fetching Farcaster profile:', error);
        setUsername(null);
        setFid(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFarcasterProfile();
  }, [referee]);

  useEffect(() => {
    const checkFrameContext = async () => {
      try {
        const context = await frameSdk.context;
        setIsFrameContext(!!context);
      } catch (error) {
        console.error('Error checking frame context:', error);
        setIsFrameContext(false);
      }
    };

    checkFrameContext();
  }, []);

  const displayName = username ? `@${username}` : formatAddress(referee);
  const isNoReferee = referee === '0x0000000000000000000000000000000000000000';

  const openProfile = async () => {
    if (fid && isFrameContext) {
      try {
        await frameSdk.actions.viewProfile({ fid });
      } catch (error) {
        console.error('Error opening Farcaster profile:', error);
        // window.open(`https://basescan.org/address/${referee}`, '_blank');
        await sdk.actions.openUrl(`https://basescan.org/address/${referee}`);
      }
    } else if (username) {
      // window.open(`https://warpcast.com/${username}`, '_blank');
      await sdk.actions.openUrl(`https://warpcast.com/${username}`);
    } else {
      // window.open(`https://basescan.org/address/${referee}`, '_blank');
      await sdk.actions.openUrl(`https://basescan.org/address/${referee}`);
    }
  };

  return (
    <div className="bg-darkPurple rounded-lg shadow-lg p-6 border border-limeGreenOpacity">
      <h3 className="text-xl font-bold text-notWhite mb-3">Game Referee</h3>
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 relative mr-3 cursor-pointer" onClick={openProfile}>
          <FarcasterAvatar address={referee} size={48} />
        </div>
        <div>
          <p 
            className="text-lg font-semibold text-deepPink cursor-pointer hover:text-fontRed"
            onClick={openProfile}
          >
            {displayName}
          </p>
          <p className="text-xs text-gray-400">
            {isNoReferee ? 'No referee assigned' : 'Do you trust this referee?'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RefereeCard;
