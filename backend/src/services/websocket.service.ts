/**
 * 📡 WebSocket Service
 * Real-time notifications and events using Socket.IO
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Types
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

interface NotificationPayload {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
}

interface ProgressPayload {
  taskId: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

// Connected users map
const connectedUsers = new Map<string, Set<string>>();

let io: Server | null = null;

/**
 * Initialize WebSocket server
 */
export function initWebSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info(`WebSocket connected: ${userId}`);

    // Add to connected users
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Ping handler (for keeping connection alive)
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Subscribe to specific channels
    socket.on('subscribe', (channels: string[]) => {
      channels.forEach(channel => {
        socket.join(channel);
        logger.debug(`User ${userId} subscribed to ${channel}`);
      });
    });

    // Unsubscribe from channels
    socket.on('unsubscribe', (channels: string[]) => {
      channels.forEach(channel => {
        socket.leave(channel);
        logger.debug(`User ${userId} unsubscribed from ${channel}`);
      });
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: ${userId} (${reason})`);
      
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
        }
      }
    });

    // Send welcome notification
    socket.emit('notification', {
      type: 'info',
      title: 'Подключено',
      message: 'Вы подключены к серверу уведомлений',
    } as NotificationPayload);
  });

  logger.info('✅ WebSocket server initialized');
  return io;
}

/**
 * Get WebSocket server instance
 */
export function getIO(): Server | null {
  return io;
}

/**
 * Send notification to a specific user
 */
export function sendNotificationToUser(userId: string, notification: NotificationPayload): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Send notification to all connected users
 */
export function broadcastNotification(notification: NotificationPayload): void {
  if (!io) return;
  io.emit('notification', notification);
}

/**
 * Send progress update to a specific user
 */
export function sendProgressToUser(userId: string, progress: ProgressPayload): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('progress', progress);
}

/**
 * Send event to a channel
 */
export function sendToChannel(channel: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(channel).emit(event, data);
}

/**
 * Notify about new chat message
 */
export function notifyNewMessage(userId: string, chatId: string, message: { role: string; content: string }): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('chat:message', { chatId, message });
}

/**
 * Notify about AI generation complete
 */
export function notifyGenerationComplete(
  userId: string, 
  type: 'presentation' | 'dissertation' | 'academic' | 'chat',
  data: Record<string, unknown>
): void {
  if (!io) return;
  
  const titles: Record<string, string> = {
    presentation: 'Презентация готова',
    dissertation: 'Диссертация сгенерирована',
    academic: 'Документ готов',
    chat: 'Ответ AI готов',
  };

  io.to(`user:${userId}`).emit('notification', {
    type: 'success',
    title: titles[type] || 'Генерация завершена',
    message: 'Нажмите, чтобы открыть',
    data,
  } as NotificationPayload);
}

/**
 * Notify about subscription changes
 */
export function notifySubscriptionChange(userId: string, plan: string, status: string): void {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('subscription:updated', { plan, status });
  
  const notification: NotificationPayload = {
    type: 'success',
    title: 'Подписка обновлена',
    message: `Ваш план: ${plan.toUpperCase()}`,
  };
  
  io.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Notify about usage limit warning
 */
export function notifyUsageLimitWarning(userId: string, usagePercent: number, type: 'tokens' | 'generations'): void {
  if (!io) return;
  
  const titles: Record<string, string> = {
    tokens: 'Токены заканчиваются',
    generations: 'AI генерации заканчиваются',
  };

  io.to(`user:${userId}`).emit('notification', {
    type: 'warning',
    title: titles[type],
    message: `Использовано ${usagePercent}% лимита`,
    link: '/pricing',
  } as NotificationPayload);
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

/**
 * Get online users count
 */
export function getOnlineUsersCount(): number {
  return connectedUsers.size;
}

export default {
  initWebSocket,
  getIO,
  sendNotificationToUser,
  broadcastNotification,
  sendProgressToUser,
  sendToChannel,
  notifyNewMessage,
  notifyGenerationComplete,
  notifySubscriptionChange,
  notifyUsageLimitWarning,
  isUserOnline,
  getOnlineUsersCount,
};
