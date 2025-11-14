/**
 * Vercel Serverless Function: /api/auth/verify
 *
 * Verifies password and sets HTTP-only session cookie
 *
 * SECURITY:
 * - Rate limited (5 attempts per 15 minutes)
 * - HTTP-only, Secure, SameSite=Strict cookies
 * - HMAC-signed session tokens
 * - Constant-time password comparison
 */

import crypto from 'crypto';

// Session configuration
const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS || '7', 10);
const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Get or generate session secret key
 */
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET_KEY;
  if (secret) return secret;

  // Auto-generate secret if not provided (not recommended for production)
  console.warn('⚠️  SESSION_SECRET_KEY not set, using auto-generated secret');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate signed session token
 */
function generateSessionToken() {
  const secret = getSessionSecret();
  const timestamp = Date.now();
  const expiry = timestamp + SESSION_EXPIRY_MS;

  // Create payload
  const payload = `${timestamp}:${expiry}`;

  // Sign with HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Combine payload + signature
  const token = `${payload}:${signature}`;

  // Base64 encode for cookie storage
  return Buffer.from(token).toString('base64');
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const aLen = Buffer.byteLength(a);
  const bLen = Buffer.byteLength(b);

  // Always compare full length to prevent early exit timing leak
  const bufA = Buffer.alloc(Math.max(aLen, bLen), 0);
  const bufB = Buffer.alloc(Math.max(aLen, bLen), 0);

  bufA.write(a);
  bufB.write(b);

  return crypto.timingSafeEqual(bufA, bufB) && aLen === bLen;
}

/**
 * In-memory rate limiting (per IP)
 * Note: This is per-instance. For distributed rate limiting, use external store (Redis, etc.)
 */
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  // Reset if window expired
  if (now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  // Check if exceeded
  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const resetIn = Math.ceil((record.resetAt - now) / 1000 / 60); // minutes
    return {
      allowed: false,
      remainingAttempts: 0,
      resetIn
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - record.count
  };
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Get client IP for rate limiting
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many attempts',
        message: `Please try again in ${rateLimit.resetIn} minutes`,
        retryAfter: rateLimit.resetIn * 60 // seconds
      });
    }

    // Extract password from request
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    // Get master password from environment
    const masterPassword = process.env.NGAUGE_MASTER_PASSWORD;

    if (!masterPassword) {
      console.error('❌ NGAUGE_MASTER_PASSWORD not set in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Authentication service not configured'
      });
    }

    // Verify password (constant-time comparison)
    const isValid = constantTimeCompare(password, masterPassword);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        remainingAttempts: rateLimit.remainingAttempts
      });
    }

    // Generate session token
    const sessionToken = generateSessionToken();

    // Set HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `ngauge_session=${sessionToken}`,
      `Max-Age=${SESSION_EXPIRY_MS / 1000}`, // Convert to seconds
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      isProduction ? 'Secure' : '' // HTTPS only in production
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      expiresIn: SESSION_EXPIRY_MS
    });

  } catch (error) {
    console.error('Error in auth verification:', error);

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'An error occurred'
    });
  }
}
