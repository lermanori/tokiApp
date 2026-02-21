import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Google's JWKS endpoint
const GOOGLE_KEYS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
// Alternative: token info endpoint for simple verification
const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

// Cache for Google's public keys
let cachedKeys: GooglePublicKey[] | null = null;
let keysCachedAt: number = 0;
const KEYS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface GooglePublicKey {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  iat: number;
  exp: number;
}

export interface GoogleAuthResult {
  success: boolean;
  sub?: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  error?: string;
}

// Fetch Google's public keys
async function fetchGooglePublicKeys(): Promise<GooglePublicKey[]> {
  const now = Date.now();

  // Return cached keys if still valid
  if (cachedKeys && (now - keysCachedAt) < KEYS_CACHE_TTL) {
    return cachedKeys;
  }

  try {
    const response = await fetch(GOOGLE_KEYS_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch Google keys: ${response.status}`);
    }

    const data = await response.json() as { keys: GooglePublicKey[] };
    cachedKeys = data.keys;
    keysCachedAt = now;

    return cachedKeys!;
  } catch (error) {
    // If fetch fails but we have cached keys, use them
    if (cachedKeys) {
      console.warn('Failed to refresh Google keys, using cached keys');
      return cachedKeys;
    }
    throw error;
  }
}

// Convert JWK to PEM format
function jwkToPem(jwk: GooglePublicKey): string {
  const publicKey = crypto.createPublicKey({
    key: {
      kty: 'RSA',
      n: jwk.n,
      e: jwk.e,
    },
    format: 'jwk',
  });

  return publicKey.export({ type: 'spki', format: 'pem' }) as string;
}

// Find the matching key by kid
function findKey(keys: GooglePublicKey[], kid: string): GooglePublicKey | undefined {
  return keys.find(key => key.kid === kid);
}

// Verify Google ID token using public keys (recommended)
export async function verifyGoogleToken(idToken: string): Promise<GoogleAuthResult> {
  try {
    // Decode header to get kid
    const decoded = jwt.decode(idToken, { complete: true });

    if (!decoded || !decoded.header || !decoded.header.kid) {
      return { success: false, error: 'Invalid token format' };
    }

    const kid = decoded.header.kid;

    // Fetch Google's public keys
    const keys = await fetchGooglePublicKeys();
    const key = findKey(keys, kid);

    if (!key) {
      return { success: false, error: 'Key not found' };
    }

    // Convert JWK to PEM
    const publicKeyPem = jwkToPem(key);

    // Verify the token
    const payload = jwt.verify(idToken, publicKeyPem, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    }) as GoogleTokenPayload;

    // Validate audience (should match one of our client IDs)
    const validAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
    ].filter(Boolean);

    if (!validAudiences.includes(payload.aud)) {
      return { success: false, error: 'Invalid audience' };
    }

    return {
      success: true,
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      givenName: payload.given_name,
      familyName: payload.family_name,
      picture: payload.picture,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, error: 'Invalid token' };
    }

    console.error('Google token verification error:', error);
    return { success: false, error: 'Verification failed' };
  }
}

// Simple verification using Google's tokeninfo endpoint (alternative)
export async function verifyGoogleTokenSimple(idToken: string): Promise<GoogleAuthResult> {
  try {
    const response = await fetch(`${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`);

    if (!response.ok) {
      const error = await response.text();
      console.error('Google token verification failed:', error);
      return { success: false, error: 'Invalid token' };
    }

    const data = await response.json() as {
      aud: string;
      sub: string;
      email: string;
      email_verified: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    // Validate audience
    const validAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
    ].filter(Boolean);

    if (!validAudiences.includes(data.aud)) {
      return { success: false, error: 'Invalid audience' };
    }

    return {
      success: true,
      sub: data.sub,
      email: data.email,
      emailVerified: data.email_verified === 'true',
      name: data.name,
      givenName: data.given_name,
      familyName: data.family_name,
      picture: data.picture,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    return { success: false, error: 'Verification failed' };
  }
}
