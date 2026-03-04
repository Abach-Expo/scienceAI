"use strict";
/**
 * 📡 WebSocket Service
 * Real-time notifications and events using Socket.IO
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.getIO = getIO;
exports.sendNotificationToUser = sendNotificationToUser;
exports.broadcastNotification = broadcastNotification;
exports.sendProgressToUser = sendProgressToUser;
exports.sendToChannel = sendToChannel;
exports.notifyNewMessage = notifyNewMessage;
exports.notifyGenerationComplete = notifyGenerationComplete;
exports.notifySubscriptionChange = notifySubscriptionChange;
exports.notifyUsageLimitWarning = notifyUsageLimitWarning;
exports.isUserOnline = isUserOnline;
exports.getOnlineUsersCount = getOnlineUsersCount;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
// Connected users map
const connectedUsers = new Map();
let io = null;
/**
 * Initialize WebSocket server
 */
function initWebSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });
    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.userEmail = decoded.email;
            next();
        }
        catch (err) {
            next(new Error('Invalid token'));
        }
    });
    // Connection handler
    io.on('connection', (socket) => {
        const userId = socket.userId;
        logger_1.logger.info(`WebSocket connected: ${userId}`);
        // Add to connected users
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId).add(socket.id);
        // Join user's personal room
        socket.join(`user:${userId}`);
        // Ping handler (for keeping connection alive)
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
        // Subscribe to specific channels
        socket.on('subscribe', (channels) => {
            channels.forEach(channel => {
                socket.join(channel);
                logger_1.logger.debug(`User ${userId} subscribed to ${channel}`);
            });
        });
        // Unsubscribe from channels
        socket.on('unsubscribe', (channels) => {
            channels.forEach(channel => {
                socket.leave(channel);
                logger_1.logger.debug(`User ${userId} unsubscribed from ${channel}`);
            });
        });
        // Disconnect handler
        socket.on('disconnect', (reason) => {
            logger_1.logger.info(`WebSocket disconnected: ${userId} (${reason})`);
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
        });
    });
    logger_1.logger.info('✅ WebSocket server initialized');
    return io;
}
/**
 * Get WebSocket server instance
 */
function getIO() {
    return io;
}
/**
 * Send notification to a specific user
 */
function sendNotificationToUser(userId, notification) {
    if (!io)
        return;
    io.to(`user:${userId}`).emit('notification', notification);
}
/**
 * Send notification to all connected users
 */
function broadcastNotification(notification) {
    if (!io)
        return;
    io.emit('notification', notification);
}
/**
 * Send progress update to a specific user
 */
function sendProgressToUser(userId, progress) {
    if (!io)
        return;
    io.to(`user:${userId}`).emit('progress', progress);
}
/**
 * Send event to a channel
 */
function sendToChannel(channel, event, data) {
    if (!io)
        return;
    io.to(channel).emit(event, data);
}
/**
 * Notify about new chat message
 */
function notifyNewMessage(userId, chatId, message) {
    if (!io)
        return;
    io.to(`user:${userId}`).emit('chat:message', { chatId, message });
}
/**
 * Notify about AI generation complete
 */
function notifyGenerationComplete(userId, type, data) {
    if (!io)
        return;
    const titles = {
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
    });
}
/**
 * Notify about subscription changes
 */
function notifySubscriptionChange(userId, plan, status) {
    if (!io)
        return;
    io.to(`user:${userId}`).emit('subscription:updated', { plan, status });
    const notification = {
        type: 'success',
        title: 'Подписка обновлена',
        message: `Ваш план: ${plan.toUpperCase()}`,
    };
    io.to(`user:${userId}`).emit('notification', notification);
}
/**
 * Notify about usage limit warning
 */
function notifyUsageLimitWarning(userId, usagePercent, type) {
    if (!io)
        return;
    const titles = {
        tokens: 'Токены заканчиваются',
        generations: 'AI генерации заканчиваются',
    };
    io.to(`user:${userId}`).emit('notification', {
        type: 'warning',
        title: titles[type],
        message: `Использовано ${usagePercent}% лимита`,
        link: '/pricing',
    });
}
/**
 * Check if user is online
 */
function isUserOnline(userId) {
    return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
}
/**
 * Get online users count
 */
function getOnlineUsersCount() {
    return connectedUsers.size;
}
exports.default = {
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
//# sourceMappingURL=websocket.service.js.map