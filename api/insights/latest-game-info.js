/**
 * Vercel Serverless Function: /api/insights/latest-game-info
 *
 * Fetches the most recent game info from AIInsights sheet
 * Returns: { gameInfo: { result, yourScore, opponentScore, practicePerformance, skipped } }
 */

import { google } from 'googleapis';

const API_TIMEOUT = 30000;

/**
 * Parse Google Cloud credentials from environment variable
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
 * Get authenticated sheets client
 */
async function getSheetsClient() {
  const credentials = getCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
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

    const sheets = await getSheetsClient();

    // Fetch AIInsights sheet data
    try {
      const response = await Promise.race([
        sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: 'AIInsights!A:G',  // Read all 7 columns
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Google Sheets API timeout')), API_TIMEOUT)
        )
      ]);

      const data = response.data.values;

      if (!data || data.length <= 1) {
        // No data or only headers
        return res.status(404).json({
          success: false,
          error: 'No game info found',
          message: 'AIInsights sheet is empty or only contains headers'
        });
      }

      // Get the most recent row (last row in the sheet)
      const latestRow = data[data.length - 1];

      // Extract game info from columns B-E
      // Format: Timestamp | Game Result | Your Score | Opponent Score | Practice Performance | Score Explanation | Team Insights Summary
      const gameInfo = {
        result: latestRow[1] !== 'N/A' ? latestRow[1] : null,
        yourScore: latestRow[2] !== 'N/A' ? parseInt(latestRow[2]) : null,
        opponentScore: latestRow[3] !== 'N/A' ? parseInt(latestRow[3]) : null,
        practicePerformance: latestRow[4] !== 'N/A' ? parseInt(latestRow[4]) : null,
        skipped: latestRow[1] === 'N/A'  // If result is N/A, it was skipped
      };

      console.log('📋 Latest game info retrieved:', gameInfo);

      return res.status(200).json({
        success: true,
        gameInfo,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Sheet doesn't exist
      if (error.code === 400 || error.message?.includes('Unable to parse range')) {
        return res.status(404).json({
          success: false,
          error: 'AIInsights sheet not found',
          message: 'The AIInsights sheet does not exist yet'
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Error in latest-game-info API:', error);

    const statusCode = error.code === 403 ? 403 :
                       error.code === 404 ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch latest game info',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Unable to process your request'
    });
  }
}
