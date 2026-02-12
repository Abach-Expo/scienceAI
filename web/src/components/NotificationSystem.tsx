import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Sparkles,
  Download,
  Trash2,
  Save,
} from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  // Быстрые методы
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

// Компонент одного уведомления
const NotificationItem = ({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: () => void;
}) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'from-green-500 to-emerald-600',
    error: 'from-red-500 to-rose-600',
    warning: 'from-amber-500 to-orange-600',
    info: 'from-blue-500 to-cyan-600',
  };

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
  };

  const Icon = icons[notification.type];

  useEffect(() => {
    if (notification.duration !== 0) {
      const timer = setTimeout(onClose, notification.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`relative w-96 rounded-xl border backdrop-blur-xl shadow-2xl ${bgColors[notification.type]}`}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[notification.type]} flex items-center justify-center flex-shrink-0`}>
            <Icon size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-text-primary font-semibold">{notification.title}</h4>
            {notification.message && (
              <p className="text-text-secondary text-sm mt-1">{notification.message}</p>
            )}
            {notification.action && (
              <button
                onClick={() => {
                  notification.action?.onClick();
                  onClose();
                }}
                className="mt-2 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      {notification.duration !== 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: (notification.duration || 5000) / 1000, ease: 'linear' }}
          className={`h-1 rounded-b-xl bg-gradient-to-r ${colors[notification.type]} origin-left`}
        />
      )}
    </motion.div>
  );
};

// Провайдер контекста
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addNotification({ type: 'success', title, message });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string) => {
    addNotification({ type: 'error', title, message });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string) => {
    addNotification({ type: 'warning', title, message });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string) => {
    addNotification({ type: 'info', title, message });
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      
      {/* Контейнер уведомлений */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3">
        <AnimatePresence mode="popLayout">
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

// Готовые уведомления для частых случаев
export const useQuickNotifications = () => {
  const { success, error, warning, info, addNotification } = useNotification();

  return {
    // Стандартные
    success,
    error,
    warning,
    info,
    
    // Кастомные
    saved: () => success('Сохранено!', 'Изменения успешно сохранены'),
    deleted: () => success('Удалено!', 'Элемент успешно удалён'),
    copied: () => success('Скопировано!', 'Текст скопирован в буфер обмена'),
    exported: (format: string) => success('Экспортировано!', `Файл успешно экспортирован в формате ${format}`),
    
    networkError: () => error('Ошибка сети', 'Проверьте подключение к интернету'),
    serverError: () => error('Ошибка сервера', 'Попробуйте позже'),
    validationError: (field: string) => error('Ошибка валидации', `Проверьте поле "${field}"`),
    
    aiGenerating: () => addNotification({
      type: 'info',
      title: 'AI генерирует контент...',
      message: 'Это может занять несколько секунд',
      duration: 0, // Не исчезает автоматически
    }),
    
    aiComplete: () => success('AI завершил генерацию!', 'Контент готов к просмотру'),
    
    upgrade: () => addNotification({
      type: 'warning',
      title: 'Достигнут лимит',
      message: 'Обновите план для продолжения работы',
      action: {
        label: 'Обновить план',
        onClick: () => window.location.href = '/pricing',
      },
      duration: 10000,
    }),
  };
};

export default NotificationProvider;
