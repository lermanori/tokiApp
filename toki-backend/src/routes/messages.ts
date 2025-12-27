import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Get user's conversations (individual chats)
router.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // Get conversations where user is either user1 or user2 AND has at least one message
    const result = await pool.query(
      `SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        CASE 
          WHEN c.user1_id = $1 THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN c.user1_id = $1 THEN u2.name
          ELSE u1.name
        END as other_user_name,
        CASE 
          WHEN c.user1_id = $1 THEN u2.avatar_url
          ELSE u1.avatar_url
        END as other_user_avatar,
        CASE 
          WHEN c.user1_id = $1 THEN u2.bio
          ELSE u1.bio
        END as other_user_bio,
        (
          SELECT m.content 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_time,
        COALESCE((
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id 
            AND m.created_at > COALESCE(crs.last_read_at, '1970-01-01'::timestamptz)
            AND m.sender_id != $1
        ), 0) as unread_count
      FROM conversations c
      JOIN users u1 ON c.user1_id = u1.id
      JOIN users u2 ON c.user2_id = u2.id
      LEFT JOIN conversation_read_state crs ON c.id = crs.conversation_id AND crs.user_id = $1
      WHERE (c.user1_id = $1 OR c.user2_id = $1)
        AND EXISTS (
          SELECT 1 FROM messages m WHERE m.conversation_id = c.id
        )
      ORDER BY COALESCE((
        SELECT m.created_at 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ), c.updated_at) DESC
      LIMIT $2 OFFSET $3`,
      [req.user!.id, limitNum, offset]
    );

    // Get total count for pagination (only conversations with messages)
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
      FROM conversations c
      WHERE (c.user1_id = $1 OR c.user2_id = $1)
        AND EXISTS (
          SELECT 1 FROM messages m WHERE m.conversation_id = c.id
        )`,
      [req.user!.id]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: {
        conversations: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch conversations'
    });
  }
});

// Start a new conversation
router.post('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'otherUserId is required'
      });
    }

    // Check if user is trying to start conversation with themselves
    if (otherUserId === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'You cannot start a conversation with yourself'
      });
    }

    // Check if target user exists
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE id = $1',
      [otherUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Check if either user has blocked the other
    const blockCheck = await pool.query(
      `SELECT id FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_user_id = $2) 
       OR (blocker_id = $2 AND blocked_user_id = $1)`,
      [req.user!.id, otherUserId]
    );

    if (blockCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Blocked user',
        message: 'Cannot start conversation with blocked users'
      });
    }

    // Check if conversation already exists
    const existingResult = await pool.query(
      `SELECT id FROM conversations 
       WHERE (user1_id = $1 AND user2_id = $2) 
          OR (user1_id = $2 AND user2_id = $1)`,
      [req.user!.id, otherUserId]
    );

    let conversationId;

    if (existingResult.rows.length > 0) {
      // Conversation already exists
      conversationId = existingResult.rows[0].id;
    } else {
      // Create new conversation
      const insertResult = await pool.query(
        `INSERT INTO conversations (user1_id, user2_id)
         VALUES ($1, $2)
         RETURNING id`,
        [req.user!.id, otherUserId]
      );
      conversationId = insertResult.rows[0].id;
    }

    return res.json({
      success: true,
      data: {
        conversationId,
        message: 'Conversation started successfully'
      }
    });
  } catch (error) {
    logger.error('Error starting conversation:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to start conversation'
    });
  }
});

// Get conversation messages
router.get('/conversations/:conversationId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = (pageNum - 1) * limitNum;

    // Verify user has access to this conversation
    const accessResult = await pool.query(
      `SELECT id FROM conversations 
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, req.user!.id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this conversation'
      });
    }

    // Get messages
    const result = await pool.query(
      `SELECT 
        m.id,
        m.content,
        m.message_type,
        m.media_url,
        m.created_at,
        m.sender_id,
        u.name as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3`,
      [conversationId, limitNum, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
      FROM messages m
      WHERE m.conversation_id = $1`,
      [conversationId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: {
        messages: result.rows.reverse(), // Reverse to get chronological order
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching conversation messages:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch messages'
    });
  }
});

// Send message to conversation
router.post('/conversations/:conversationId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text', mediaUrl } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'Message content is required'
      });
    }

    // Verify user has access to this conversation
    const accessResult = await pool.query(
      `SELECT id, user1_id, user2_id FROM conversations 
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, req.user!.id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this conversation'
      });
    }

    // Check if either user has blocked the other
    const conversation = accessResult.rows[0];
    const otherUserId = conversation.user1_id === req.user!.id ? conversation.user2_id : conversation.user1_id;
    
    const blockCheck = await pool.query(
      `SELECT id FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_user_id = $2) 
       OR (blocker_id = $2 AND blocked_user_id = $1)`,
      [req.user!.id, otherUserId]
    );

    if (blockCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Blocked user',
        message: 'Cannot send messages to blocked users'
      });
    }

    // Insert message with explicit UTC timestamp from Node.js
    // Store messages in pure UTC timezone
    const utcTimestamp = new Date().toISOString();
    
    logger.debug('🕐 DEBUG: UTC timestamp for DB:', utcTimestamp);
    
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [conversationId, req.user!.id, content.trim(), messageType, mediaUrl, utcTimestamp]
    );

    // Update conversation updated_at
    await pool.query(
      `UPDATE conversations 
       SET updated_at = NOW() 
       WHERE id = $1`,
      [conversationId]
    );

    // Get sender info for WebSocket emission
    const senderResult = await pool.query(
      'SELECT name, avatar_url FROM users WHERE id = $1',
      [req.user!.id]
    );

    const messageData = {
      id: result.rows[0].id,
      content: content.trim(),
      message_type: messageType,
      media_url: mediaUrl,
      created_at: result.rows[0].created_at,
      sender_id: req.user!.id,
      sender_name: senderResult.rows[0].name,
      sender_avatar: senderResult.rows[0].avatar_url,
      conversation_id: conversationId
    };

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      logger.info('📤 [BACKEND] SENDING EVENT: message-received');
      logger.info('📤 [BACKEND] Room: conversation-', conversationId);
      logger.debug('📤 [BACKEND] Sender ID:', req.user!.id);
      logger.debug('📤 [BACKEND] Message data:', messageData);
      
      // Get room members for logging
      const roomName = `conversation-${conversationId}`;
      const roomMembers = io.sockets.adapter.rooms.get(roomName);
      logger.debug('📤 [BACKEND] Room members in', roomName, ':', roomMembers ? roomMembers.size : 0, 'users');
      
      io.to(roomName).emit('message-received', messageData);
      logger.info('✅ [BACKEND] Event message-received sent to room:', roomName);
    } else {
      logger.warn('❌ [BACKEND] WebSocket io instance not found!');
    }

    return res.json({
      success: true,
      data: {
        messageId: result.rows[0].id,
        createdAt: result.rows[0].created_at,
        message: 'Message sent successfully'
      }
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to send message'
    });
  }
});

// Mark conversation as read
router.post('/conversations/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversationId = id; // UUID is already a string
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID',
        message: 'Conversation ID is required'
      });
    }

    // Verify user has access to this conversation
    const accessResult = await pool.query(
      `SELECT id FROM conversations 
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, req.user!.id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this conversation'
      });
    }

    // Get the latest message timestamp in this conversation
    const latestMessageResult = await pool.query(
      `SELECT created_at FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [conversationId]
    );

    if (latestMessageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No messages found',
        message: 'This conversation has no messages'
      });
    }

    const latestMessageTime = latestMessageResult.rows[0].created_at;

    // Update or insert the read state using current timestamp
    await pool.query(
      `INSERT INTO conversation_read_state (conversation_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET 
         last_read_at = CASE 
           WHEN conversation_read_state.last_read_at < NOW() THEN NOW()
           ELSE conversation_read_state.last_read_at
         END`,
      [conversationId, req.user!.id]
    );

    // Emit read:update event to conversation participants
    const io = req.app.get('io');
    if (io) {
      const roomName = `conversation-${conversationId}`;
      io.to(roomName).emit('read:update', {
        conversation_id: conversationId,
        user_id: req.user!.id,
        last_read_at: new Date().toISOString()
      });
      logger.info('📤 [BACKEND] Emitted read:update event for conversation:', conversationId);
    }

    return res.json({
      success: true,
      message: 'Conversation marked as read',
      data: {
        conversation_id: conversationId,
        last_read_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error marking conversation as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to mark conversation as read'
    });
  }
});

// Get Toki group messages
router.get('/tokis/:tokiId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tokiId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = (pageNum - 1) * limitNum;

    // Verify user has access to this Toki (is participant or host)
    const accessResult = await pool.query(
      `SELECT t.id FROM tokis t
       LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.user_id = $2
       WHERE t.id = $1 AND (t.host_id = $2 OR tp.status = 'approved')`,
      [tokiId, req.user!.id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this Toki chat'
      });
    }

    // Get messages
    const result = await pool.query(
      `SELECT 
        m.id,
        m.content,
        m.message_type,
        m.media_url,
        m.created_at,
        m.sender_id,
        u.name as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.toki_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3`,
      [tokiId, limitNum, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
      FROM messages m
      WHERE m.toki_id = $1`,
      [tokiId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: {
        messages: result.rows.reverse(), // Reverse to get chronological order
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching Toki messages:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch Toki messages'
    });
  }
});

// Send message to Toki group
router.post('/tokis/:tokiId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tokiId } = req.params;
    const { content, messageType = 'text', mediaUrl } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'Message content is required'
      });
    }

    // Verify user has access to this Toki (is participant or host)
    const accessResult = await pool.query(
      `SELECT t.id, t.host_id FROM tokis t
       LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.user_id = $2
       WHERE t.id = $1 AND (t.host_id = $2 OR tp.status = 'approved')`,
      [tokiId, req.user!.id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this Toki chat'
      });
    }

    // Check if user is blocked by the Toki host
    const toki = accessResult.rows[0];
    if (toki.host_id !== req.user!.id) {
      const blockCheck = await pool.query(
        `SELECT id FROM user_blocks 
         WHERE (blocker_id = $1 AND blocked_user_id = $2) 
         OR (blocker_id = $2 AND blocked_user_id = $1)`,
        [req.user!.id, toki.host_id]
      );

      if (blockCheck.rows.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Blocked user',
          message: 'Cannot send messages to Tokis hosted by blocked users'
        });
      }
    }

    // Insert message with explicit UTC timestamp from Node.js
    // Store messages in pure UTC timezone
    const utcTimestamp = new Date().toISOString();
    
    logger.debug('🕐 DEBUG: UTC timestamp for DB:', utcTimestamp);
    
    const result = await pool.query(
      `INSERT INTO messages (toki_id, sender_id, content, message_type, media_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [tokiId, req.user!.id, content.trim(), messageType, mediaUrl, utcTimestamp]
    );

    // Debug timestamp
    logger.debug('🕐 DEBUG: Node.js UTC timestamp:', utcTimestamp);
    logger.debug('🕐 DEBUG: Raw DB timestamp:', result.rows[0].created_at);
    logger.debug('🕐 DEBUG: Timestamp type:', typeof result.rows[0].created_at);
    logger.debug('🕐 DEBUG: Current server time:', new Date().toISOString());
    logger.debug('🕐 DEBUG: Server local time:', new Date().toLocaleString());
    logger.debug('🕐 DEBUG: Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    logger.debug('🕐 DEBUG: Expected UTC hour:', new Date().getUTCHours());
    logger.debug('🕐 DEBUG: Expected local hour:', new Date().getHours());

    // Get sender info for WebSocket emission
    const senderResult = await pool.query(
      'SELECT name, avatar_url FROM users WHERE id = $1',
      [req.user!.id]
    );

    const messageData = {
      id: result.rows[0].id,
      content: content.trim(),
      message_type: messageType,
      media_url: mediaUrl,
      created_at: result.rows[0].created_at,
      sender_id: req.user!.id,
      sender_name: senderResult.rows[0].name,
      sender_avatar: senderResult.rows[0].avatar_url,
      toki_id: tokiId
    };

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      logger.info('📤 [BACKEND] SENDING EVENT: toki-message-received');
      logger.info('📤 [BACKEND] Room: toki-', tokiId);
      logger.debug('📤 [BACKEND] Sender ID:', req.user!.id);
      logger.debug('📤 [BACKEND] Message data:', messageData);
      
      // Get room members for logging
      const roomName = `toki-${tokiId}`;
      const roomMembers = io.sockets.adapter.rooms.get(roomName);
      logger.debug('📤 [BACKEND] Room members in', roomName, ':', roomMembers ? roomMembers.size : 0, 'users');
      
      io.to(roomName).emit('toki-message-received', messageData);
      logger.info('✅ [BACKEND] Event toki-message-received sent to room:', roomName);
    } else {
      logger.warn('❌ [BACKEND] WebSocket io instance not found!');
    }

    return res.json({
      success: true,
      data: {
        messageId: result.rows[0].id,
        createdAt: result.rows[0].created_at,
        message: 'Message sent successfully'
      }
    });
  } catch (error) {
    logger.error('Error sending Toki message:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to send message'
    });
  }
});

// Report a message
router.post('/:messageId/report', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const reporterId = req.user!.id;

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Report reason is required'
      });
    }

    // Check if message exists and get its details
    const messageResult = await pool.query(
      'SELECT id, sender_id, content, conversation_id, toki_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const message = messageResult.rows[0];

    // Check if user is reporting their own message
    if (message.sender_id === reporterId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot report your own message'
      });
    }

    // Insert report into unified content_reports table
    const reportResult = await pool.query(
      `INSERT INTO content_reports (
        content_type,
        content_id, 
        reporter_id, 
        reason, 
        reported_at,
        status
      ) VALUES ($1, $2, $3, $4, NOW(), 'pending') 
      ON CONFLICT (reporter_id, content_type, content_id) 
      WHERE status = 'pending' 
      DO NOTHING
      RETURNING id`,
      ['message', messageId, reporterId, reason.trim()]
    );

    // Check if report was actually inserted (not a duplicate)
    if (reportResult.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already reported this message'
      });
    }

    logger.info(`🚨 [MESSAGES] Message ${messageId} reported by user ${reporterId} for reason: ${reason}`);

    return res.json({
      success: true,
      message: 'Message reported successfully',
      data: {
        reportId: reportResult.rows[0].id
      }
    });
  } catch (error) {
    logger.error('Error reporting message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to report message'
    });
  }
});

// Delete message
router.delete('/messages/:messageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    // Verify user owns this message
    const messageResult = await pool.query(
      `SELECT sender_id FROM messages WHERE id = $1`,
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
        message: 'The specified message does not exist'
      });
    }

    if (messageResult.rows[0].sender_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only delete your own messages'
      });
    }

    // Delete message
    await pool.query(
      `DELETE FROM messages WHERE id = $1`,
      [messageId]
    );

    return res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting message:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete message'
    });
  }
});

// Get user's Toki group chats
router.get('/tokis/group-chats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // Get Tokis where user is host or approved participant
    const result = await pool.query(
      `SELECT 
        t.id,
        t.title,
        t.description,
        t.category,
        t.image_urls,
        t.created_at,
        t.updated_at,
        u.name as host_name,
        (
          SELECT m.content 
          FROM messages m 
          WHERE m.toki_id = t.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.toki_id = t.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_time,
        COALESCE((
          SELECT COUNT(*)
          FROM messages m
          WHERE m.toki_id = t.id 
            AND m.created_at > COALESCE(trs.last_read_at, '1970-01-01'::timestamptz)
            AND m.sender_id != $1
        ), 0) as unread_count
      FROM tokis t
      JOIN users u ON t.host_id = u.id
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.user_id = $1
      LEFT JOIN toki_read_state trs ON t.id = trs.toki_id AND trs.user_id = $1
      WHERE t.status = 'active'
        AND (t.host_id = $1 OR tp.status = 'approved')
      ORDER BY COALESCE((
        SELECT m.created_at 
        FROM messages m 
        WHERE m.toki_id = t.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ), t.updated_at) DESC
      LIMIT $2 OFFSET $3`,
      [req.user!.id, limitNum, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
      FROM tokis t
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.user_id = $1
      WHERE t.status = 'active'
        AND (t.host_id = $1 OR tp.status = 'approved')`,
      [req.user!.id]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: {
        chats: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching Toki group chats:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch Toki group chats'
    });
  }
});

// Mark Toki as read
router.post('/tokis/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tokiId = id; // UUID is already a string
    
    if (!tokiId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Toki ID',
        message: 'Toki ID is required'
      });
    }

    // Verify user has access to this Toki (is participant or host)
    const accessResult = await pool.query(
      `SELECT t.id FROM tokis t
       LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.user_id = $2
       WHERE t.id = $1 AND (t.host_id = $2 OR tp.status = 'approved')`,
      [tokiId, req.user!.id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this Toki'
      });
    }

    // Get the latest message timestamp in this Toki
    const latestMessageResult = await pool.query(
      `SELECT created_at FROM messages 
       WHERE toki_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [tokiId]
    );

    if (latestMessageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No messages found',
        message: 'This Toki has no messages'
      });
    }

    const latestMessageTime = latestMessageResult.rows[0].created_at;

    // Update or insert the read state using current timestamp
    await pool.query(
      `INSERT INTO toki_read_state (toki_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (toki_id, user_id)
       DO UPDATE SET 
         last_read_at = CASE 
           WHEN toki_read_state.last_read_at < NOW() THEN NOW()
           ELSE toki_read_state.last_read_at
         END`,
      [tokiId, req.user!.id]
    );

    // Emit read:update event to Toki participants
    const io = req.app.get('io');
    if (io) {
      const roomName = `toki-${tokiId}`;
      io.to(roomName).emit('read:update', {
        toki_id: tokiId,
        user_id: req.user!.id,
        last_read_at: new Date().toISOString()
      });
      logger.info('📤 [BACKEND] Emitted read:update event for Toki:', tokiId);
    }

    return res.json({
      success: true,
      message: 'Toki marked as read',
      data: {
        toki_id: tokiId,
        last_read_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error marking Toki as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to mark Toki as read'
    });
  }
});

export default router; 