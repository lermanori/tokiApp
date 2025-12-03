import { pool } from '../config/database';

/**
 * Generate a unique invite code for toki invite links
 * @param length - Length of the code (default: 8)
 * @returns Promise<string> - Unique invite code
 */
export async function generateInviteCode(length: number = 8): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const maxRetries = 10;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const existing = await pool.query(
      'SELECT id FROM toki_invite_links WHERE invite_code = $1',
      [code]
    );
    
    if (existing.rows.length === 0) {
      return code;
    }
  }
  
  throw new Error('Failed to generate unique invite code after maximum retries');
}

/**
 * Deactivate all existing active invite links for a toki
 * @param tokiId - ID of the toki
 * @param createdBy - ID of the user creating the new link
 */
export async function deactivateExistingLinks(tokiId: string, createdBy: string): Promise<void> {
  await pool.query(
    'UPDATE toki_invite_links SET is_active = false, updated_at = NOW() WHERE toki_id = $1 AND created_by = $2 AND is_active = true',
    [tokiId, createdBy]
  );
}

/**
 * Validate an invite link
 * @param inviteCode - The invite code to validate
 * @returns Promise<{isValid: boolean, linkData?: any, error?: string}>
 */
export async function validateInviteLink(inviteCode: string): Promise<{
  isValid: boolean;
  linkData?: any;
  error?: string;
}> {
  try {
    const result = await pool.query(
      `SELECT 
        il.*,
        t.id as toki_id,
        t.title as toki_title,
        t.visibility as toki_visibility,
        t.max_attendees as toki_max_attendees,
        t.status as toki_status,
        u.name as host_name,
        u.avatar_url as host_avatar
      FROM toki_invite_links il
      JOIN tokis t ON il.toki_id = t.id
      JOIN users u ON t.host_id = u.id
      WHERE il.invite_code = $1 AND il.is_active = true`,
      [inviteCode]
    );

    if (result.rows.length === 0) {
      return { isValid: false, error: 'Invalid or expired invite link' };
    }

    const linkData = result.rows[0];

    // Check if toki is still active
    if (linkData.toki_status !== 'active') {
      return { isValid: false, error: 'This event is no longer active' };
    }

    // Check usage limits
    if (linkData.max_uses && linkData.used_count >= linkData.max_uses) {
      return { isValid: false, error: 'This invite link has reached its usage limit' };
    }

    return { isValid: true, linkData };
  } catch (error) {
    console.error('Error validating invite link:', error);
    return { isValid: false, error: 'Failed to validate invite link' };
  }
}

/**
 * Increment the usage count for an invite link
 * @param inviteCode - The invite code
 */
export async function incrementLinkUsage(inviteCode: string): Promise<void> {
  await pool.query(
    'UPDATE toki_invite_links SET used_count = used_count + 1, updated_at = NOW() WHERE invite_code = $1',
    [inviteCode]
  );
}

/**
 * Check if a user is already a participant in a toki
 * @param tokiId - ID of the toki
 * @param userId - ID of the user
 * @returns Promise<boolean>
 */
export async function isUserParticipant(tokiId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM toki_participants WHERE toki_id = $1 AND user_id = $2 AND status = $3',
    [tokiId, userId, 'approved']
  );
  
  return result.rows.length > 0;
}

/**
 * Add user to toki participants
 * @param tokiId - ID of the toki
 * @param userId - ID of the user
 * @returns Promise<boolean> - Success status
 */
export async function addUserToToki(tokiId: string, userId: string): Promise<boolean> {
  try {
    // Check if toki has space
    const tokiResult = await pool.query(
      'SELECT max_attendees, (SELECT COUNT(*) FROM toki_participants WHERE toki_id = $1 AND status = $2) as current_count FROM tokis WHERE id = $1',
      [tokiId, 'approved']
    );

    if (tokiResult.rows.length === 0) {
      return false;
    }

    const { max_attendees, current_count } = tokiResult.rows[0];
    
    // Skip capacity check if max_attendees is NULL (unlimited)
    if (max_attendees !== null && max_attendees !== undefined && current_count >= max_attendees) {
      return false; // Toki is full
    }

    // Insert or update participant record
    await pool.query(
      `INSERT INTO toki_participants (toki_id, user_id, status, joined_at) 
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (toki_id, user_id) 
       DO UPDATE SET status = $3, joined_at = NOW()`,
      [tokiId, userId, 'approved']
    );

    return true;
  } catch (error) {
    console.error('Error adding user to toki:', error);
    return false;
  }
}
