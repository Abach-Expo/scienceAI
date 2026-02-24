/**
 * 🔔 Notification Center Component
 * Real-time notifications dropdown with WebSocket integration
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Trash2,
  ExternalLink 
} from 'lucide-react';
import { useWebSocketStore, useUnreadNotifications, Notification } from '../services/websocket';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/languageStore';

export default function NotificationCenter() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    isConnected, 
    connect, 
    disconnect, 
    markNotificationRead, 
    clearNotifications 
  } = useWebSocketStore();
  const unreadCount = useUnreadNotifications();
  const { token, isAuthenticated } = useAuthStore();

  // Connect/disconnect WebSocket based on auth state
  useEffect(() => {
    if (isAuthenticated && token) {
      connect(token);
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect]);

  const getIcon = (type: Notification['type']) => {
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

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    return `${days} дн. назад`;
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationRead(notification.id);
    if (notification.link) {
      window.location.href = notification.link;
    }
    setIsOpen(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-bg-tertiary hover:bg-bg-secondary transition-colors"
        aria-label={t('settings.notifications')}
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        
        {/* Connection indicator */}
        <span 
          className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`}
        />
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-accent-primary text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-bg-secondary rounded-2xl shadow-2xl border border-border-primary z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border-primary">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-accent-primary" />
                  <h3 className="font-semibold text-text-primary">Уведомления</h3>
                  {!isConnected && (
                    <span className="text-xs text-red-400">(офлайн)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                      title="Очистить все"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-text-muted">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Нет уведомлений</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-primary">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 cursor-pointer hover:bg-bg-tertiary transition-colors ${
                          !notification.read ? 'bg-accent-primary/5' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-medium text-sm ${
                                notification.read ? 'text-text-secondary' : 'text-text-primary'
                              }`}>
                                {notification.title}
                              </p>
                              {notification.link && (
                                <ExternalLink className="w-3 h-3 text-text-muted flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-text-muted line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-text-muted mt-1">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-accent-primary rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-border-primary bg-bg-tertiary/50">
                  <button
                    onClick={() => {
                      notifications.forEach(n => markNotificationRead(n.id));
                    }}
                    className="w-full py-2 text-sm text-accent-primary hover:text-accent-hover transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Отметить все как прочитанные
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
