import pool from '../config/database';
import bcrypt from 'bcryptjs';

interface ValidKey {
  id: string;
  scopes: string[];
  user_id: string;
}

/**
 * Validate an admin API key against the mcp_api_keys table.
 * Returns key id, scopes, and user_id on success, or null on failure.
 */
export async function validateAdminKey(rawKey: string): Promise<ValidKey | null> {
  if (!rawKey) return null;

  const result = await pool.query(
    `SELECT id, key_hash, scopes, user_id
     FROM mcp_api_keys
     WHERE revoked_at IS NULL`,
  );

  for (const row of result.rows) {
    const match = await bcrypt.compare(rawKey, row.key_hash);
    if (match) {
      await pool.query(
        'UPDATE mcp_api_keys SET last_used_at = NOW() WHERE id = $1',
        [row.id]
      );
      return {
        id: row.id,
        scopes: (row.scopes || []) as string[],
        user_id: row.user_id,
      };
    }
  }

  return null;
}


