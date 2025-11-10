/**
 * Vercel Serverless Function: /api/health
 *
 * Health check endpoint for monitoring service status
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    service: 'NGauge API',
    version: '1.0.0',
    checks: {
      sheetId: !!process.env.VITE_GOOGLE_SHEET_ID,
      geminiKey: !!process.env.GEMINI_API_KEY,
      credentials: !!process.env.GOOGLE_CREDENTIALS_BASE64,
    }
  };

  return res.status(200).json(health);
}
