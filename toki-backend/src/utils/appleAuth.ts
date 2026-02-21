import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Apple's JWKS endpoint
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

// Cache for Apple's public keys
let cachedKeys: ApplePublicKey[] | null = null;
let keysCachedAt: number = 0;
const KEYS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface ApplePublicKey {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  nonce?: string;
  nonce_supported?: boolean;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
  real_user_status?: number;
  auth_time?: number;
}

export interface AppleAuthResult {
  success: boolean;
  sub?: string;
  email?: string;
  emailVerified?: boolean;
  isPrivateEmail?: boolean;
  error?: string;
}

// Fetch Apple's public keys
async function fetchApplePublicKeys(): Promise<ApplePublicKey[]> {
  const now = Date.now();

  // Return cached keys if still valid
  if (cachedKeys && (now - keysCachedAt) < KEYS_CACHE_TTL) {
    return cachedKeys;
  }

  try {
    const response = await fetch(APPLE_KEYS_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch Apple keys: ${response.status}`);
    }

    const data = await response.json() as { keys: ApplePublicKey[] };
    cachedKeys = data.keys;
    keysCachedAt = now;

    return cachedKeys!;
  } catch (error) {
    // If fetch fails but we have cached keys, use them
    if (cachedKeys) {
      console.warn('Failed to refresh Apple keys, using cached keys');
      return cachedKeys;
    }
    throw error;
  }
}

// Convert JWK to PEM format
function jwkToPem(jwk: ApplePublicKey): string {
  // Convert base64url to base64
  const n = Buffer.from(jwk.n.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const e = Buffer.from(jwk.e.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  // Create RSA public key in DER format
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
function findKey(keys: ApplePublicKey[], kid: string): ApplePublicKey | undefined {
  return keys.find(key => key.kid === kid);
}

// Verify Apple identity token
export async function verifyAppleToken(
  identityToken: string,
  options?: {
    nonce?: string;
    bundleId?: string;
    serviceId?: string;
  }
): Promise<AppleAuthResult> {
  try {
    // Decode header to get kid
    const decoded = jwt.decode(identityToken, { complete: true });

    if (!decoded || !decoded.header || !decoded.header.kid) {
      return { success: false, error: 'Invalid token format' };
    }

    const kid = decoded.header.kid;

    // Fetch Apple's public keys
    const keys = await fetchApplePublicKeys();
    const key = findKey(keys, kid);

    if (!key) {
      return { success: false, error: 'Key not found' };
    }

    // Convert JWK to PEM
    const publicKeyPem = jwkToPem(key);

    // Verify the token
    const payload = jwt.verify(identityToken, publicKeyPem, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    }) as AppleTokenPayload;

    // Validate audience (bundle ID for native, service ID for web)
    const validAudiences = [
      process.env.APPLE_BUNDLE_ID,
      process.env.APPLE_SERVICE_ID,
      options?.bundleId,
      options?.serviceId,
    ].filter(Boolean);

    if (!validAudiences.includes(payload.aud)) {
      return { success: false, error: 'Invalid audience' };
    }

    // Validate nonce if provided
    if (options?.nonce && payload.nonce !== options.nonce) {
      return { success: false, error: 'Invalid nonce' };
    }

    // Extract email verification status
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    const isPrivateEmail = payload.is_private_email === true || payload.is_private_email === 'true';

    return {
      success: true,
      sub: payload.sub,
      email: payload.email,
      emailVerified,
      isPrivateEmail,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, error: 'Invalid token' };
    }

    console.error('Apple token verification error:', error);
    return { success: false, error: 'Verification failed' };
  }
}

// Generate client secret for Apple Sign In with Apple web flow
export function generateAppleClientSecret(): string {
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_SERVICE_ID;

  if (!privateKey || !teamId || !keyId || !clientId) {
    throw new Error('Missing Apple configuration environment variables');
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 86400 * 180, // 180 days (max allowed)
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  // Handle private key format (may have escaped newlines)
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  return jwt.sign(payload, formattedKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: keyId,
    },
  });
}

// Exchange authorization code for tokens (for web flow)
export async function exchangeAppleCode(
  authorizationCode: string,
  redirectUri: string
): Promise<{ idToken: string; refreshToken: string } | null> {
  try {
    const clientSecret = generateAppleClientSecret();

    const params = new URLSearchParams({
      client_id: process.env.APPLE_SERVICE_ID!,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Apple token exchange error:', error);
      return null;
    }

    const data = await response.json() as { id_token: string; refresh_token: string };

    return {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    console.error('Apple code exchange error:', error);
    return null;
  }
}
