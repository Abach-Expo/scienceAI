/**
 * 📡 WebSocket Service (Client)
 * Real-time notifications and events using Socket.IO
 */

import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

// Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
}

export interface ProgressUpdate {
  taskId: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

// WebSocket store
interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  progressTasks: Map<string, ProgressUpdate>;
  
  // Actions
  connect: (token: string) => void;
  disconnect: () => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  clearProgress: (taskId: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://api.science-ai.app';

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  notifications: [],
  progressTasks: new Map(),

  connect: (token: string) => {
    const { socket: existingSocket } = get();
    
    // Already connected
    if (existingSocket?.connected) {
      return;
    }

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', (_reason) => {
      set({ isConnected: false });
    });

    socket.on('connect_error', (_error) => {
      set({ isConnected: false });
    });

    // Notification handler
    socket.on('notification', (data: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      const notification: Notification = {
        ...data,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date(),
        read: false,
      };

      set(state => ({
        notifications: [notification, ...state.notifications].slice(0, 50), // Keep max 50
      }));

      // Show browser notification if allowed
      if (Notification.permission === 'granted' && document.hidden) {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192.png',
        });
      }
    });

    // Progress handler
    socket.on('progress', (data: ProgressUpdate) => {
      set(state => {
        const newProgress = new Map(state.progressTasks);
        newProgress.set(data.taskId, data);
        return { progressTasks: newProgress };
      });
    });

    // Chat message handler
    socket.on('chat:message', (data: { chatId: string; message: unknown }) => {
      // Emit custom event for chat components to listen
      window.dispatchEvent(new CustomEvent('ws:chat:message', { detail: data }));
    });

    // Subscription update handler
    socket.on('subscription:updated', (data: { plan: string; status: string }) => {
      window.dispatchEvent(new CustomEvent('ws:subscription:updated', { detail: data }));
    });

    // Keep alive ping
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000);

    socket.on('pong', () => {
      // Connection is alive
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      clearInterval(pingInterval);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  subscribe: (channels: string[]) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('subscribe', channels);
    }
  },

  unsubscribe: (channels: string[]) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('unsubscribe', channels);
    }
  },

  markNotificationRead: (id: string) => {
    set(state => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  clearProgress: (taskId: string) => {
    set(state => {
      const newProgress = new Map(state.progressTasks);
      newProgress.delete(taskId);
      return { progressTasks: newProgress };
    });
  },
}));

// Hook for easy access to unread count
export function useUnreadNotifications() {
  return useWebSocketStore(state => state.notifications.filter(n => !n.read).length);
}

// Hook for progress tracking
export function useProgress(taskId: string) {
  return useWebSocketStore(state => state.progressTasks.get(taskId));
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export default useWebSocketStore;
