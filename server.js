/**
 * Backend Server for Google Sheets API
 *
 * This server handles Google Sheets API calls using service account
 * so the frontend doesn't need to expose credentials
 *
 * SECURITY FEATURES:
 * - Helmet.js for security headers (CSP, XSS protection, etc.)
 * - Rate limiting to prevent abuse and DoS attacks
 * - CORS whitelist for allowed origins only
 * - Input validation and sanitization
 * - Request timeouts for external APIs
 * - Production-ready error handling
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { google } from 'googleapis';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

/**
 * Helmet.js - Secure HTTP headers
 * Protects against: XSS, clickjacking, MIME sniffing, etc.
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Vercel preview
}));

/**
 * CORS Configuration - Whitelist allowed origins
 * CRITICAL: Only allow requests from trusted frontend domains
 */
const allowedOrigins = [
  'http://localhost:3000',           // Local development
  'http://localhost:5173',           // Vite dev server
  process.env.FRONTEND_URL,          // Production frontend URL
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Rate Limiting - Prevent abuse and DoS attacks
 * Limits: 100 requests per 15 minutes per IP
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

app.use('/api/', limiter);

/**
 * Stricter rate limit for AI analysis endpoint (more expensive)
 * Limits: 20 requests per 15 minutes per IP
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many AI analysis requests, please try again later.',
    retryAfter: '15 minutes'
  },
});

/**
 * Body Parser with size limits to prevent payload attacks
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// ENVIRONMENT VARIABLES & CONFIGURATION
// =============================================================================

const SHEET_ID = process.env.VITE_GOOGLE_SHEET_ID;
const CREDENTIALS_PATH = process.env.VITE_GOOGLE_CREDENTIALS_PATH;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Allow selecting which sheet tab to use for baseline values
const BASELINE_SHEET_RANGE = process.env.VITE_GOOGLE_BASELINE_SHEET || 'Baseline';

// Validate required environment variables on startup
if (!SHEET_ID) {
  console.error('❌ FATAL: VITE_GOOGLE_SHEET_ID is not set in environment variables');
  process.exit(1);
}

if (!CREDENTIALS_PATH) {
  console.error('❌ FATAL: VITE_GOOGLE_CREDENTIALS_PATH is not set in environment variables');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('❌ FATAL: GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

/**
 * Configuration for different analysis types
 */
const ANALYSIS_CONFIGS = {
  'score-explanation': {
    model: 'gemini-2.5-flash',
    temperature: 0.5,  // More deterministic for numerical explanations
    maxOutputTokens: 1500,
    description: 'LLM explanation of score variance and trends'
  },
  'team-insights': {
    model: 'gemini-2.5-flash',
    temperature: 0.7,  // More creative for qualitative insights
    maxOutputTokens: 2048,
    description: 'AI-powered team chemistry insights'
  }
};

/**
 * Timeout for external API calls (30 seconds)
 */
const API_TIMEOUT = 30000;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - external service took too long to respond');
    }
    throw error;
  }
}

/**
 * Sanitize error messages for production
 * Prevents information leakage to potential attackers
 */
function sanitizeError(error, isDevelopment) {
  if (isDevelopment) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code
    };
  }

  // Production: Return generic error messages
  return {
    message: 'An error occurred while processing your request'
  };
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * GET /api/sheets
 * Fetches data from Google Sheets using service account
 *
 * SECURITY:
 * - Rate limited to prevent abuse
 * - Credentials stored server-side only
 * - Error messages sanitized in production
 */
app.get('/api/sheets', async (req, res) => {
  try {
    // Check if credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error('Credentials file not found:', CREDENTIALS_PATH);
      return res.status(500).json({
        error: 'Service configuration error',
        message: NODE_ENV === 'development'
          ? `Credentials file not found: ${CREDENTIALS_PATH}`
          : 'Service is not properly configured'
      });
    }

    // Read and parse credentials
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const authClient = await auth.getClient();

    // Create sheets API instance
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Fetch data with timeout protection
    const response = await Promise.race([
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Weekly',
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Google Sheets API timeout')), API_TIMEOUT)
      )
    ]);

    const data = response.data.values;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found',
        message: 'The sheet appears to be empty or the range is invalid'
      });
    }

    // Return the raw data
    res.json({
      success: true,
      values: data,
      rowCount: data.length,
      columnCount: data[0]?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);

    // Determine appropriate status code
    const statusCode = error.code === 403 ? 403 :
                       error.code === 404 ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch data',
      ...(NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : {
        message: 'Unable to retrieve data from the source'
      })
    });
  }
});

/**
 * GET /api/baseline
 * Fetches baseline data from Google Sheets "Baseline" sheet
 * Returns empty response if baseline sheet doesn't exist or is empty
 * This is NOT an error condition - the app should gracefully handle missing baseline
 *
 * SECURITY:
 * - Rate limited to prevent abuse
 * - Credentials stored server-side only
 * - Error messages sanitized in production
 */
app.get('/api/baseline', async (req, res) => {
  try {
    // Check if credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error('Credentials file not found:', CREDENTIALS_PATH);
      return res.status(500).json({
        error: 'Service configuration error',
        message: NODE_ENV === 'development'
          ? `Credentials file not found: ${CREDENTIALS_PATH}`
          : 'Service is not properly configured'
      });
    }

    // Read and parse credentials
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const authClient = await auth.getClient();

    // Create sheets API instance
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Fetch baseline data with timeout protection
    const response = await Promise.race([
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: BASELINE_SHEET_RANGE,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Google Sheets API timeout')), API_TIMEOUT)
      )
    ]);

    const data = response.data.values;

    // If no data or empty, return success with empty values
    // This is NOT an error - baseline is optional
    if (!data || data.length === 0) {
      return res.json({
        success: true,
        hasBaseline: false,
        values: [],
        rowCount: 0,
        columnCount: 0,
        timestamp: new Date().toISOString(),
        message: 'No baseline data found - this is expected if baseline has not been set'
      });
    }

    // Return the baseline data
    res.json({
      success: true,
      hasBaseline: true,
      values: data,
      rowCount: data.length,
      columnCount: data[0]?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching baseline data:', error);

    // If the error is because the "Baseline" sheet doesn't exist, return empty (not an error)
    if (error.message?.includes('Unable to parse range') ||
        error.code === 400 ||
        error.message?.includes('not found')) {
      return res.json({
        success: true,
        hasBaseline: false,
        values: [],
        rowCount: 0,
        columnCount: 0,
        timestamp: new Date().toISOString(),
        message: 'Baseline sheet does not exist - this is expected if baseline has not been set'
      });
    }

    // For real errors (auth, network, etc.), return 500
    const statusCode = error.code === 403 ? 403 : 500;

    res.status(statusCode).json({
      success: false,
      hasBaseline: false,
      error: 'Failed to fetch baseline data',
      ...(NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : {
        message: 'Unable to retrieve baseline data from the source'
      })
    });
  }
});

/**
 * POST /api/analyze
 * Sends prompt to Gemini API for team analysis
 * Supports multiple analysis types with different configurations
 *
 * SECURITY:
 * - Input validation and sanitization
 * - Rate limited (20 requests per 15 minutes)
 * - Request timeout protection
 * - Prompt length limits to prevent abuse
 */
app.post(
  '/api/analyze',
  aiLimiter, // Apply stricter rate limit for AI endpoint
  [
    // Input validation middleware
    body('prompt')
      .trim()
      .notEmpty().withMessage('Prompt is required')
      .isLength({ min: 10, max: 50000 }).withMessage('Prompt must be between 10 and 50,000 characters')
      .escape(), // Sanitize to prevent XSS
    body('type')
      .optional()
      .trim()
      .isIn(['team-insights', 'score-explanation']).withMessage('Invalid analysis type'),
    body('config')
      .optional()
      .isObject().withMessage('Config must be an object')
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const { prompt, type = 'team-insights', config } = req.body;

      // Get configuration for analysis type (or use custom config)
      const analysisConfig = config || ANALYSIS_CONFIGS[type] || ANALYSIS_CONFIGS['team-insights'];

      console.log(`📊 Running ${type} analysis with config:`, {
        model: analysisConfig.model,
        temperature: analysisConfig.temperature,
        maxTokens: analysisConfig.maxOutputTokens
      });

      // Call Gemini API with type-specific configuration and timeout
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${analysisConfig.model}:generateContent?key=${GEMINI_API_KEY}`;

      const geminiResponse = await fetchWithTimeout(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: analysisConfig.temperature,
            maxOutputTokens: analysisConfig.maxOutputTokens,
          }
        })
      });

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();

      // Extract the generated text
      const analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!analysis) {
        throw new Error('No analysis generated by Gemini');
      }

      res.json({
        success: true,
        analysis,
        type,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error calling Gemini API:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to generate analysis',
        ...(NODE_ENV === 'development' ? {
          message: error.message
        } : {
          message: 'Unable to process your request at this time'
        })
      });
    }
  }
);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sheetId: SHEET_ID
  });
});

// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================

/**
 * Session configuration
 */
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
 * In-memory rate limiting for auth endpoint
 */
const authRateLimitStore = new Map();
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;

function checkAuthRateLimit(ip) {
  const now = Date.now();
  const record = authRateLimitStore.get(ip);

  if (!record) {
    authRateLimitStore.set(ip, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remainingAttempts: AUTH_RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  // Reset if window expired
  if (now > record.resetAt) {
    authRateLimitStore.set(ip, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remainingAttempts: AUTH_RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  // Check if exceeded
  if (record.count >= AUTH_RATE_LIMIT_MAX_ATTEMPTS) {
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
    remainingAttempts: AUTH_RATE_LIMIT_MAX_ATTEMPTS - record.count
  };
}

/**
 * POST /api/auth/verify
 * Verifies password and sets session cookie
 */
app.post('/api/auth/verify', [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isString().withMessage('Password must be a string')
], (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  try {
    // Get client IP for rate limiting
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Check rate limit
    const rateLimit = checkAuthRateLimit(ip);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many attempts',
        message: `Please try again in ${rateLimit.resetIn} minutes`,
        retryAfter: rateLimit.resetIn * 60 // seconds
      });
    }

    const { password } = req.body;

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
    const cookieOptions = [
      `ngauge_session=${sessionToken}`,
      `Max-Age=${SESSION_EXPIRY_MS / 1000}`, // Convert to seconds
      'Path=/',
      'HttpOnly',
      'SameSite=Strict'
    ].join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    return res.json({
      success: true,
      message: 'Authentication successful',
      expiresIn: SESSION_EXPIRY_MS
    });

  } catch (error) {
    console.error('Error in auth verification:', error);

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

/**
 * GET /api/auth/status
 * Check if user has valid session
 */
app.get('/api/auth/status', (req, res) => {
  try {
    // Extract session token from cookies
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.ngauge_session;

    if (!sessionToken) {
      return res.json({
        authenticated: false,
        reason: 'No session cookie'
      });
    }

    // Verify token
    const verification = verifySessionToken(sessionToken);

    if (!verification.valid) {
      return res.json({
        authenticated: false,
        reason: verification.error
      });
    }

    // Return success with expiration info
    return res.json({
      authenticated: true,
      expiresAt: verification.expiresAt,
      remainingTime: verification.remainingTime
    });

  } catch (error) {
    console.error('Error checking auth status:', error);

    return res.status(500).json({
      authenticated: false,
      error: 'Status check failed',
      message: NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

/**
 * POST /api/auth/logout
 * Clear session cookie
 */
app.post('/api/auth/logout', (req, res) => {
  try {
    // Clear cookie by setting Max-Age to 0
    const cookieOptions = [
      'ngauge_session=',
      'Max-Age=0',
      'Path=/',
      'HttpOnly',
      'SameSite=Strict'
    ].join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Error during logout:', error);

    return res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Sheet ID: ${SHEET_ID}`);
  console.log(`🔑 Credentials: ${CREDENTIALS_PATH}`);
  console.log();
  console.log(`API Endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/api/sheets`);
  console.log(`  GET  http://localhost:${PORT}/api/baseline`);
  console.log(`  POST http://localhost:${PORT}/api/analyze`);
  console.log(`  POST http://localhost:${PORT}/api/auth/verify`);
  console.log(`  GET  http://localhost:${PORT}/api/auth/status`);
  console.log(`  POST http://localhost:${PORT}/api/auth/logout`);
  console.log(`  GET  http://localhost:${PORT}/health`);
});
