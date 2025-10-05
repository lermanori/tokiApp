import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.post('/', async (req, res) => {
  const { email, phone, location, reason, platform } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Invalid email' });
  }
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS waitlist_signups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        phone text,
        location text,
        reason text,
        platform text,
        created_at timestamptz NOT NULL DEFAULT now()
      );`
    );

    await pool.query(
      `INSERT INTO waitlist_signups (email, phone, location, reason, platform)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE
       SET phone = EXCLUDED.phone,
           location = EXCLUDED.location,
           reason = EXCLUDED.reason,
           platform = EXCLUDED.platform`,
      [email.trim(), phone || null, location || null, reason || null, platform || null]
    );

    return res.json({ success: true });
  } catch (e: any) {
    console.error('Waitlist insert error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;


