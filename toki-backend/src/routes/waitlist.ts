import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.post('/', async (req, res) => {
  const { email, phone, location, reason, platform } = req.body || {};
  
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Invalid email' });
  }

  try {
    // Check if email already exists
    const existingUser = await pool.query(
      `SELECT id, email, location FROM waitlist_signups WHERE email = $1`,
      [email.trim()]
    );

    let isNewSignup = false;

    if (existingUser.rows.length === 0) {
      // New signup - insert
      await pool.query(
        `INSERT INTO waitlist_signups (email, phone, location, reason, platform)
         VALUES ($1,$2,$3,$4,$5)`,
        [email.trim(), phone || null, location || null, reason || null, platform || null]
      );
      isNewSignup = true;
    }

    // Count total users to determine position
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM waitlist_signups`
    );
    const userPosition = parseInt(countResult.rows[0]?.count || '0', 10);

    // Use location from request body
    const userCity = location || 'your city';

    // Send welcome email using Resend (only for new signups)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (RESEND_API_KEY && isNewSignup) {
      const subject = "You're in. 🖤";
      const text = `Hey,\n\nYou're officially on the waitlist for Toki.\nYou're number **#${userPosition}** on the **${userCity}** list.\nWe'll let you know the moment you can drop in.\n\nIn the meantime, don't be a stranger.\nTell your people. The more of us here, the better it gets.\n\n—\nToki`;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          from: "onboarding@toki-app.com",
          subject,
          text,
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        console.error('Resend email failed:', errorText);
        // Don't fail the request if email fails
      }
    }

    return res.json({ success: true, position: userPosition });
  } catch (e: any) {
    console.error('Waitlist insert error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;


