/**
 * Vercel Serverless Function: /api/baseline
 *
 * Fetches baseline data from Google Sheets "Baseline" or "Monthly template" sheet
 * Returns empty response if baseline sheet doesn't exist - this is NOT an error
 *
 * SECURITY:
 * - Environment variables stored in Vercel dashboard
 * - Credentials never exposed to frontend
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
    const BASELINE_SHEET_RANGE = process.env.VITE_GOOGLE_BASELINE_SHEET || 'Baseline';

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
      return res.status(200).json({
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
    return res.status(200).json({
      success: true,
      hasBaseline: true,
      values: data,
      rowCount: data.length,
      columnCount: data[0]?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching baseline data:', error);

    // If the error is because the baseline sheet doesn't exist, return empty (not an error)
    if (error.message?.includes('Unable to parse range') ||
        error.code === 400 ||
        error.message?.includes('not found')) {
      return res.status(200).json({
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

    return res.status(statusCode).json({
      success: false,
      hasBaseline: false,
      error: 'Failed to fetch baseline data',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Unable to retrieve baseline data from the source'
    });
  }
}
