/**
 * 📡 WebSocket Service
 * Real-time notifications and events using Socket.IO
 */
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
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
/**
 * Initialize WebSocket server
 */
export declare function initWebSocket(server: HttpServer): Server;
/**
 * Get WebSocket server instance
 */
export declare function getIO(): Server | null;
/**
 * Send notification to a specific user
 */
export declare function sendNotificationToUser(userId: string, notification: NotificationPayload): void;
/**
 * Send notification to all connected users
 */
export declare function broadcastNotification(notification: NotificationPayload): void;
/**
 * Send progress update to a specific user
 */
export declare function sendProgressToUser(userId: string, progress: ProgressPayload): void;
/**
 * Send event to a channel
 */
export declare function sendToChannel(channel: string, event: string, data: unknown): void;
/**
 * Notify about new chat message
 */
export declare function notifyNewMessage(userId: string, chatId: string, message: {
    role: string;
    content: string;
}): void;
/**
 * Notify about AI generation complete
 */
export declare function notifyGenerationComplete(userId: string, type: 'presentation' | 'dissertation' | 'academic' | 'chat', data: Record<string, unknown>): void;
/**
 * Notify about subscription changes
 */
export declare function notifySubscriptionChange(userId: string, plan: string, status: string): void;
/**
 * Notify about usage limit warning
 */
export declare function notifyUsageLimitWarning(userId: string, usagePercent: number, type: 'tokens' | 'generations'): void;
/**
 * Check if user is online
 */
export declare function isUserOnline(userId: string): boolean;
/**
 * Get online users count
 */
export declare function getOnlineUsersCount(): number;
declare const _default: {
    initWebSocket: typeof initWebSocket;
    getIO: typeof getIO;
    sendNotificationToUser: typeof sendNotificationToUser;
    broadcastNotification: typeof broadcastNotification;
    sendProgressToUser: typeof sendProgressToUser;
    sendToChannel: typeof sendToChannel;
    notifyNewMessage: typeof notifyNewMessage;
    notifyGenerationComplete: typeof notifyGenerationComplete;
    notifySubscriptionChange: typeof notifySubscriptionChange;
    notifyUsageLimitWarning: typeof notifyUsageLimitWarning;
    isUserOnline: typeof isUserOnline;
    getOnlineUsersCount: typeof getOnlineUsersCount;
};
export default _default;
//# sourceMappingURL=websocket.service.d.ts.map