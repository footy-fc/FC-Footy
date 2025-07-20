import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../context/GameContext';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface NotificationBannerProps {
  className?: string;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ className = '' }) => {
  const { notifications, clearNotification } = useGameContext();
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Show new notifications with animation
    const newNotifications = notifications
      .filter(n => !visibleNotifications.includes(n.id))
      .map(n => n.id);
    
    if (newNotifications.length > 0) {
      setVisibleNotifications(prev => [...prev, ...newNotifications]);
    }
  }, [notifications, visibleNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/20 border-green-500 text-green-200';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-500 text-yellow-200';
      case 'error':
        return 'bg-red-900/20 border-red-500 text-red-200';
      default:
        return 'bg-blue-900/20 border-blue-500 text-blue-200';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {notifications.slice(0, 3).map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border-l-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${getNotificationStyles(notification.type)}`}
        >
          {getNotificationIcon(notification.type)}
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => clearNotification(notification.id)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationBanner; 