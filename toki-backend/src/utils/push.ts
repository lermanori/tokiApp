import { Expo } from 'expo-server-sdk';
import { pool } from '../config/database';

const expo = new Expo();

export async function sendPushToUsers(userIds: string[], payload: { title: string; body: string; data?: any }) {
  if (!userIds || userIds.length === 0) return;

  const res = await pool.query(
    `SELECT token FROM push_tokens WHERE user_id = ANY($1::uuid[])`,
    [userIds]
  );

  const tokens = res.rows.map(r => r.token).filter((t: string) => Expo.isExpoPushToken(t));
  if (tokens.length === 0) return;

  const messages = tokens.map((to: string) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  }));

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

      // Cleanup invalid tokens
      for (let i = 0; i < ticketChunk.length; i++) {
        const ticket = ticketChunk[i];
        if (ticket.status === 'error' && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          const invalidToken = chunk[i].to;
          await pool.query('DELETE FROM push_tokens WHERE token = $1', [invalidToken]);
        }
      }
    } catch (e) {
      console.error('Error sending push chunk:', e);
    }
  }
}


