import React, { useState } from 'react';
import { useGameContext } from '../../context/GameContext';
import { Clock, Activity, Bell, X, Trophy, Users, Target } from 'lucide-react';

interface LiveMatchEventsProps {
  className?: string;
}

const LiveMatchEvents: React.FC<LiveMatchEventsProps> = ({ className = '' }) => {
  const { 
    matchEvents, 
    lastEvent, 
    isMatchLive, 
    recentActivity, 
    notifications, 
    clearNotification,
    timeUntilMatch,
    gameStatus,
    gameClock,
    homeScore,
    awayScore,
    gameDataState
  } = useGameContext();

  const [activeTab, setActiveTab] = useState<'events' | 'activity' | 'notifications'>('events');
  const [isExpanded, setIsExpanded] = useState(false);

  const getEventIcon = (event: any) => {
    if (event.scoringPlay) return '⚽';
    if (event.redCard) return '🟥';
    if (event.yellowCard) return '🟨';
    if (event.penaltyKick) return '🎯';
    return '📊';
  };

  const getEventDescription = (event: any) => {
    if (event.scoringPlay) {
      const player = event.athletesInvolved?.[0]?.displayName || 'Unknown player';
      return `${player} scores!`;
    }
    if (event.redCard) {
      const player = event.athletesInvolved?.[0]?.displayName || 'Unknown player';
      return `${player} sent off`;
    }
    if (event.yellowCard) {
      const player = event.athletesInvolved?.[0]?.displayName || 'Unknown player';
      return `${player} booked`;
    }
    return event.type?.text || 'Match event';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <Users className="w-4 h-4" />;
      case 'goal': return <Trophy className="w-4 h-4" />;
      case 'card': return <Target className="w-4 h-4" />;
      case 'match_start': return <Clock className="w-4 h-4" />;
      case 'match_end': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!gameDataState) return null;

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-limeGreenOpacity" />
          <h3 className="text-lg font-semibold text-notWhite">Live Updates</h3>
          {isMatchLive && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs text-white font-medium">LIVE</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Match Status Bar */}
          <div className="p-4 bg-gray-900 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-notWhite">{homeScore}</div>
                  <div className="text-xs text-gray-400">Home</div>
                </div>
                <div className="text-center">
                  <div className="text-lg text-gray-400">vs</div>
                  <div className="text-xs text-gray-400">{gameStatus}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-notWhite">{awayScore}</div>
                  <div className="text-xs text-gray-400">Away</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-limeGreenOpacity">{gameClock}</div>
                {timeUntilMatch && (
                  <div className="text-xs text-gray-400">Starts in {timeUntilMatch}</div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'events' 
                  ? 'text-limeGreenOpacity border-b-2 border-limeGreenOpacity' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Events ({matchEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'activity' 
                  ? 'text-limeGreenOpacity border-b-2 border-limeGreenOpacity' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Activity ({recentActivity.length})
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'notifications' 
                  ? 'text-limeGreenOpacity border-b-2 border-limeGreenOpacity' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-1" />
              ({notifications.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="max-h-64 overflow-y-auto">
            {activeTab === 'events' && (
              <div className="p-4 space-y-3">
                {matchEvents.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    <p>No match events yet</p>
                    <p className="text-sm">Events will appear here during the match</p>
                  </div>
                ) : (
                  matchEvents.slice(-10).reverse().map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-900 rounded">
                      <span className="text-lg">{getEventIcon(event)}</span>
                      <div className="flex-1">
                        <div className="text-sm text-notWhite">{getEventDescription(event)}</div>
                        <div className="text-xs text-gray-400">{event.clock?.displayValue}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="p-4 space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Activity className="w-8 h-8 mx-auto mb-2" />
                    <p>No recent activity</p>
                    <p className="text-sm">Game activity will appear here</p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-900 rounded">
                      <div className="text-limeGreenOpacity">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-notWhite">{activity.message}</div>
                        <div className="text-xs text-gray-400">{formatTime(activity.timestamp)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Bell className="w-8 h-8 mx-auto mb-2" />
                    <p>No notifications</p>
                    <p className="text-sm">Notifications will appear here</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="flex items-center gap-3 p-2 bg-gray-900 rounded">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <div className="text-sm text-notWhite">{notification.message}</div>
                        <div className="text-xs text-gray-400">{formatTime(notification.timestamp)}</div>
                      </div>
                      <button
                        onClick={() => clearNotification(notification.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LiveMatchEvents; 