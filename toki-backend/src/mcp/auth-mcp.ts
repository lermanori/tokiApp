import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import logger from '../utils/logger';

export interface MCPUserContext {
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Verify JWT token from request body and return user context
 * Returns null if token is missing or invalid
 */
export async function authenticateMCPRequest(token: string | undefined): Promise<MCPUserContext | null> {
  if (!token) {
    logger.warn('[MCP] Missing token in request body');
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Verify user exists and get role
    const result = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      logger.warn(`[MCP] User not found: ${decoded.id}`);
      return null;
    }

    const user = result.rows[0];
    const isAdmin = user.role === 'admin';

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      logger.warn(`[MCP] Invalid token: ${error instanceof Error ? error.message : String(error)}`);
    } else {
      logger.error(`[MCP] Token verification error:`, error);
    }
    return null;
  }
}
