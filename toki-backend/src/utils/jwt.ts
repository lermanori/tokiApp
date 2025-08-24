import jwt from 'jsonwebtoken';
import { JWTPayload } from '../middleware/auth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserTokenData {
  id: string;
  email: string;
  name: string;
}

// Generate access token
export const generateAccessToken = (user: UserTokenData): string => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(payload, process.env.JWT_SECRET as jwt.Secret, { expiresIn } as any);
};

// Generate refresh token
export const generateRefreshToken = (user: UserTokenData): string => {
  const payload = {
    id: user.id,
    type: 'refresh'
  };
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, process.env.JWT_SECRET as jwt.Secret, { expiresIn } as any);
};

// Generate both access and refresh tokens
export const generateTokenPair = (user: UserTokenData): TokenPair => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user)
  };
};

// Verify refresh token
export const verifyRefreshToken = (token: string): { id: string; type: string } | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return {
      id: decoded.id,
      type: decoded.type
    };
  } catch (error) {
    return null;
  }
};

// Extract token from Authorization header
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

// Decode token without verification (for logging/debugging)
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as any;
    
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
}; 