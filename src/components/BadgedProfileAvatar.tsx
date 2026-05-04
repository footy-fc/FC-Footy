"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Image from "next/image";

interface BadgedProfileAvatarProps {
  pfpUrl?: string;
  alt: string;
  badgeLogoUrl?: string;
  badgeAlt?: string;
  sizeClassName?: string;
  badgeSize?: number;
  className?: string;
  fallbackClassName?: string;
}

const BadgedProfileAvatar: React.FC<BadgedProfileAvatarProps> = ({
  pfpUrl,
  alt,
  badgeLogoUrl,
  badgeAlt,
  sizeClassName = "h-10 w-10",
  badgeSize = 16,
  className = "",
  fallbackClassName = "text-lightPurple",
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [pfpUrl]);

  return (
    <div className={`relative shrink-0 ${sizeClassName} ${className}`}>
      <div className="h-full w-full overflow-hidden rounded-full">
        {pfpUrl && !imageFailed ? (
          <img
            src={pfpUrl}
            alt={alt}
            width={badgeSize * 4}
            height={badgeSize * 4}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-darkPurple ${fallbackClassName}`}>
            <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
      </div>

      {badgeLogoUrl ? (
        <div
          className="absolute bottom-0 right-0 rounded-full border-2 border-darkPurple bg-darkPurple shadow-[0_8px_18px_rgba(0,0,0,0.28)]"
          style={{ width: badgeSize + 8, height: badgeSize + 8, padding: 2 }}
        >
          <Image
            src={badgeLogoUrl}
            alt={badgeAlt || "Favorite club badge"}
            width={badgeSize}
            height={badgeSize}
            className="rounded-full"
          />
        </div>
      ) : null}
    </div>
  );
};

export default BadgedProfileAvatar;
