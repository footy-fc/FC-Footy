import React from "react";
import YouTubeChannelHome from "./YouTubeChannelHome";

interface HomeTabProps {
  onNavigate: (tab: string) => void;
  viewerFid?: number;
}

const HomeTab: React.FC<HomeTabProps> = () => {
  return <YouTubeChannelHome />;
};

export default HomeTab;
