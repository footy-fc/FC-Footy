'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { sdk as frameSdk, sdk } from "@farcaster/miniapp-sdk";
import { fetchFarcasterProfileByAddress, getDefaultProfilePicture } from '../utils/fetchFarcasterProfile';
import { formatAddress } from '../utils/formatters';

// Cache for Farcaster profiles to avoid redundant API calls
const profileCache: Record<string, {
  imageUrl: string;
  username: string;
  fid?: number;
  timestamp: number;
}> = {};

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

interface FarcasterAvatarProps {
  address: string;
  size?: number;
  className?: string;
  onClick?: () => void; // Optional custom onClick handler
  disableClick?: boolean; // Disable clickable functionality (e.g., in referee mode)
  showName?: boolean; // Optional flag to show username next to avatar
  fallbackName?: string; // Optional fallback name if no username
}

/**
 * FarcasterAvatar - A component that displays a Farcaster profile picture for an Ethereum address
 */
const FarcasterAvatar: React.FC<FarcasterAvatarProps> = ({ 
  address, 
  size = 24,
  className = '',
  onClick,
  disableClick = false,
  showName = false,
  fallbackName = ''
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [fid, setFid] = useState<number | null>(null);
  const [isFrameContext, setIsFrameContext] = useState<boolean>(false);

  useEffect(() => {
    const checkFrameContext = async () => {
      try {
        const context = await frameSdk.context;
        setIsFrameContext(!!context);
      } catch {
        setIsFrameContext(false);
      }
    };
    checkFrameContext();
  }, []);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!address) {
        const defaultImage = getDefaultProfilePicture();
        setImageUrl(defaultImage);
        setIsLoading(false);
        return;
      }

      const normalizedAddress = address.toLowerCase();
      const cachedProfile = profileCache[normalizedAddress];
      const now = Date.now();

      if (cachedProfile && (now - cachedProfile.timestamp) < CACHE_EXPIRATION) {
        setImageUrl(cachedProfile.imageUrl);
        setUsername(cachedProfile.username);
        if (cachedProfile.fid) setFid(cachedProfile.fid);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const profile = await fetchFarcasterProfileByAddress(normalizedAddress);

        let resultImageUrl = getDefaultProfilePicture();
        let resultUsername = '';
        let resultFid: number | undefined = undefined;

        if (profile && profile.pfp?.url) {
          resultImageUrl = profile.pfp.url;
          resultUsername = profile.username || profile.displayName || '';
          resultFid = profile.fid;
        }

        setImageUrl(resultImageUrl);
        setUsername(resultUsername);
        setFid(resultFid || null);

        profileCache[normalizedAddress] = {
          imageUrl: resultImageUrl,
          username: resultUsername,
          fid: resultFid,
          timestamp: now
        };
      } catch (error) {
        const fallbackImage = getDefaultProfilePicture();
        setImageUrl(fallbackImage);
        setUsername('');
        setFid(null);
        console.log('Error fetching profile:', error);
        profileCache[normalizedAddress] = {
          imageUrl: fallbackImage,
          username: '',
          timestamp: now
        };
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [address]);

  const handleClick = async () => {
    if (disableClick) return;
    if (onClick) return onClick();

    if (fid && isFrameContext) {
      try {
        await frameSdk.actions.viewProfile({ fid });
        return;
      } catch {
        // window.open(`https://basescan.org/address/${address}`, '_blank');
        await sdk.actions.openUrl(`https://basescan.org/address/${address}`);
        return;
      }
    }

    if (username) {
      // window.open(`https://warpcast.com/${username}`, '_blank');
      await sdk.actions.openUrl(`https://warpcast.com/${username}`);
    } else {
      // window.open(`https://basescan.org/address/${address}`, '_blank');
      await sdk.actions.openUrl(`https://basescan.org/address/${address}`);

    }
  };

  if (isLoading) {
    return (
      <div 
        className={`rounded-full bg-gray-300 animate-pulse ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  const isDefault = imageUrl.includes('defifa_spinner.gif');
  const clickable = !!username && !disableClick;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`relative ${clickable ? 'cursor-pointer' : ''}`}
        title={username ? `@${username}` : `View on Basescan`}
        style={{ width: `${size}px`, height: `${size}px`, overflow: 'hidden' }}
        onClick={clickable ? handleClick : undefined}
      >
        {isDefault ? (
          <img
            src={imageUrl}
            alt="Default avatar"
            width={size}
            height={size}
            className="w-full h-full object-contain"
          />
        ) : (
          <Image
            src={imageUrl}
            alt={username || 'Profile'}
            width={size}
            height={size}
            className="rounded-full"
            onError={(e) => {
              console.error('Error loading image:', imageUrl);
              e.currentTarget.src = getDefaultProfilePicture();
            }}
          />
        )}
        {username && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border border-gray-800" title="Farcaster profile found" />
        )}
      </div>
      {showName && (
        <span className="truncate max-w-[140px] text-notWhite text-sm">
          {username || fallbackName || formatAddress(address)}
        </span>
      )}
    </div>
  );
};

export default FarcasterAvatar;
