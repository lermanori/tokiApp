import express from 'express';
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { Expo } from 'expo-server-sdk';

const router = express.Router();

router.post('/register', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { token, platform } = req.body as { token: string; platform?: string };
    if (!token) return res.status(400).json({ success: false, message: 'Missing token' });

    await pool.query(
      `INSERT INTO push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW()`,
      [userId, token, platform || 'unknown']
    );

    return res.json({ success: true });
  } catch (e) {
    console.error('push/register error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/unregister', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { token } = req.body as { token: string };
    if (!token) return res.status(400).json({ success: false, message: 'Missing token' });

    await pool.query('DELETE FROM push_tokens WHERE token = $1 AND user_id = $2', [token, userId]);
    return res.json({ success: true });
  } catch (e) {
    console.error('push/unregister error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/send-test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const expo = new Expo();
    const tokens = (await pool.query('SELECT token FROM push_tokens WHERE user_id = $1', [userId])).rows.map(r => r.token);
    const messages = tokens.filter((t: string) => Expo.isExpoPushToken(t)).map((to: string) => ({
      to,
      sound: 'default',
      title: 'Test notification',
      body: 'Hello from Toki!',
      data: { source: 'test' },
    }));
    const chunks = expo.chunkPushNotifications(messages);
    const receipts: any[] = [];
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      receipts.push(...ticketChunk);
    }
    return res.json({ success: true, receipts });
  } catch (e) {
    console.error('push/send-test error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;


