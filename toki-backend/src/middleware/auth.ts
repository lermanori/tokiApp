import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

// Verify JWT token middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Verify user still exists in database
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User no longer exists'
      });
    }

    const user = result.rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Authentication token has expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without user
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Verify user still exists in database
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name
      };
    }

    return next();
  } catch (error) {
    // Don't fail for invalid tokens in optional auth
    return next();
  }
};

// Check if user is the owner of a resource
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to perform this action'
      });
    }

    const resourceId = req.params[resourceIdParam];
    
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        error: 'Resource ID required',
        message: 'Resource ID is missing from request'
      });
    }

    // For now, we'll check ownership in the route handlers
    // This middleware just ensures the user is authenticated
    return next();
  };
};

// Check if user is the host of a Toki
export const requireTokiHost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to perform this action'
      });
    }

    const tokiId = req.params.id || req.params.tokiId;
    
    if (!tokiId) {
      return res.status(400).json({
        success: false,
        error: 'Toki ID required',
        message: 'Toki ID is missing from request'
      });
    }

    const result = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1',
      [tokiId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    const toki = result.rows[0];
    
    if (toki.host_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only perform this action on Tokis you host'
      });
    }

    return next();
  } catch (error) {
    console.error('Toki host check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Internal server error while checking permissions'
    });
  }
}; 