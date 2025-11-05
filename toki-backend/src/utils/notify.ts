import { pool } from '../config/database';
import { sendPushToUsers } from './push';

export type SystemNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedTokiId?: string | null;
  relatedUserId?: string | null;
  pushData?: any;
};

export async function createSystemNotificationAndPush(input: SystemNotificationInput) {
  const { userId, type, title, message, relatedTokiId, relatedUserId, pushData } = input;

  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, related_toki_id, related_user_id, read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
    [userId, type, title, message, relatedTokiId || null, relatedUserId || null]
  );

  await sendPushToUsers([userId], {
    title,
    body: message,
    data: { type, tokiId: relatedTokiId, userId: relatedUserId, ...pushData },
  });
}


