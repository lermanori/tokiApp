import { pool } from '../config/database';
import { sendPushToUsers } from './push';
import { Server } from 'socket.io';
import logger from './logger';

export type SystemNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedTokiId?: string | null;
  relatedUserId?: string | null;
  pushData?: any;
  io?: Server; // Add io as optional parameter (same pattern as chat messages)
};

export async function createSystemNotificationAndPush(input: SystemNotificationInput) {
  const { userId, type, title, message, relatedTokiId, relatedUserId, pushData, io } = input;

  logger.info('📬 [NOTIFY] Notification created:', type, 'for user:', userId);

  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, related_toki_id, related_user_id, read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
     RETURNING id, created_at`,
    [userId, type, title, message, relatedTokiId || null, relatedUserId || null]
  );

  const notificationData = {
    id: result.rows[0].id,
    user_id: userId,
    type,
    title,
    message,
    related_toki_id: relatedTokiId,
    related_user_id: relatedUserId,
    read: false,
    created_at: result.rows[0].created_at,
  };

  // Emit WebSocket event to user's personal room (same pattern as chat messages)
  if (io) {
    const roomName = `user-${userId}`;
    const roomMembers = io.sockets.adapter.rooms.get(roomName);
    logger.info(`📬 [NOTIFY] Notification (type: ${type}) sent to room: ${roomName}`);
    logger.info(`📬 [NOTIFY] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);
    
    io.to(roomName).emit('notification-received', notificationData);
  } else {
    logger.warn('❌ [NOTIFY] WebSocket io instance not found!');
  }

  await sendPushToUsers([userId], {
    title,
    body: message,
    data: { type, tokiId: relatedTokiId, userId: relatedUserId, ...pushData },
  });
}


