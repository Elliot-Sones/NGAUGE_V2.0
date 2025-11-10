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

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Sheet ID: ${SHEET_ID}`);
  console.log(`🔑 Credentials: ${CREDENTIALS_PATH}`);
  console.log();
  console.log(`API Endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/api/sheets`);
  console.log(`  POST http://localhost:${PORT}/api/analyze`);
  console.log(`  GET  http://localhost:${PORT}/health`);
});
