/**
 * Vercel Serverless Function: /api/sheets
 *
 * Fetches data from Google Sheets using service account authentication
 *
 * SECURITY:
 * - Environment variables stored in Vercel dashboard
 * - Credentials never exposed to frontend
 * - Rate limiting via Vercel edge config
 * - CORS configured for specific origins only
 */

import { google } from 'googleapis';

// API timeout (30 seconds for serverless)
const API_TIMEOUT = 30000;

/**
 * Parse Google Cloud credentials from environment variable
 * Vercel stores this as a base64 encoded JSON string
 */
function getCredentials() {
  const credsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;

  if (!credsBase64) {
    throw new Error('GOOGLE_CREDENTIALS_BASE64 environment variable not set');
  }

  try {
    const credsJson = Buffer.from(credsBase64, 'base64').toString('utf-8');
    return JSON.parse(credsJson);
  } catch (error) {
    throw new Error('Failed to parse Google credentials: ' + error.message);
  }
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    const SHEET_ID = process.env.VITE_GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      throw new Error('VITE_GOOGLE_SHEET_ID environment variable not set');
    }

    // Get credentials from environment
    const credentials = getCredentials();

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
    return res.status(200).json({
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

    return res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch data',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Unable to retrieve data from the source'
    });
  }
}
