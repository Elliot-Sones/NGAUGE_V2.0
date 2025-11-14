/**
 * Vercel Serverless Function: /api/auth/status
 *
 * Checks if user has valid session cookie
 *
 * SECURITY:
 * - Verifies HMAC signature
 * - Checks expiration timestamp
 * - No user data exposed (stateless verification)
 */

import crypto from 'crypto';

/**
 * Get or generate session secret key
 */
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET_KEY;
  if (secret) return secret;

  // Auto-generate secret if not provided (must match verify.js)
  console.warn('⚠️  SESSION_SECRET_KEY not set, using auto-generated secret');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify session token signature and expiration
 */
function verifySessionToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'No token provided' };
    }

    // Decode from base64
    const decoded = Buffer.from(token, 'base64').toString('utf-8');

    // Parse token: timestamp:expiry:signature
    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [timestamp, expiry, providedSignature] = parts;

    // Verify expiration
    const now = Date.now();
    const expiryTime = parseInt(expiry, 10);

    if (isNaN(expiryTime) || now > expiryTime) {
      return { valid: false, error: 'Token expired' };
    }

    // Re-compute signature
    const secret = getSessionSecret();
    const payload = `${timestamp}:${expiry}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );

    if (!signaturesMatch) {
      return { valid: false, error: 'Invalid signature' };
    }

    return {
      valid: true,
      expiresAt: expiryTime,
      remainingTime: expiryTime - now
    };

  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * Parse cookies from request header
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
    return cookies;
  }, {});
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      authenticated: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Extract session token from cookies
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.ngauge_session;

    if (!sessionToken) {
      return res.status(200).json({
        authenticated: false,
        reason: 'No session cookie'
      });
    }

    // Verify token
    const verification = verifySessionToken(sessionToken);

    if (!verification.valid) {
      return res.status(200).json({
        authenticated: false,
        reason: verification.error
      });
    }

    // Return success with expiration info
    return res.status(200).json({
      authenticated: true,
      expiresAt: verification.expiresAt,
      remainingTime: verification.remainingTime
    });

  } catch (error) {
    console.error('Error checking auth status:', error);

    return res.status(500).json({
      authenticated: false,
      error: 'Status check failed',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'An error occurred'
    });
  }
}
