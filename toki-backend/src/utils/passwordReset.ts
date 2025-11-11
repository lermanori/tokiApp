import crypto from 'crypto';
import { pool } from '../config/database';

export type PasswordLinkPurpose = 'welcome' | 'reset';

export interface IssueTokenResult {
  token: string;
  expiresAt: Date;
  expiryHours: number;
  link: string;
}

async function getExpiryHoursFromSettings(): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'password_reset_expiry_hours'`
    );
    if (result.rows.length > 0) {
      const raw = result.rows[0].value;
      const parsed =
        typeof raw === 'object'
          ? Number(raw)
          : Number(typeof raw === 'string' ? raw : String(raw));
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 168) {
        return parsed;
      }
    }
  } catch {
    // ignore and fall back
  }
  return 2; // default 2 hours
}

export async function issuePasswordResetToken(
  userId: string,
  purpose: PasswordLinkPurpose
): Promise<IssueTokenResult> {
  const expiryHours = await getExpiryHoursFromSettings();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  await pool.query(
    'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
    [token, expiresAt, userId]
  );

  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  const path = purpose === 'welcome' ? '/set-password' : '/reset-password';
  const link = `${base}${path}?token=${encodeURIComponent(token)}`;

  return { token, expiresAt, expiryHours, link };
}


