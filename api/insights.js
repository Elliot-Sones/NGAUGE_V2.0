/**
 * Vercel Serverless Function: /api/insights
 *
 * Manages AI-generated insights storage in Google Sheets
 * - GET: Fetches stored insights from "AIInsights" sheet
 * - POST: Saves new insights to "AIInsights" sheet
 *
 * SHEET STRUCTURE (AIInsights):
 * Row 1: Headers [Timestamp | Game Result | Your Score | Opponent Score | Practice Performance (1-10) | Score Explanation | Team Insights Summary]
 * Row 2+: Data rows with game info and AI analysis (one row per analysis)
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

/**
 * Fetch insights from Google Sheets
 */
async function fetchInsights(sheets, sheetId) {
  try {
    const response = await Promise.race([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'AIInsights!A:G',  // Read all 7 columns
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Google Sheets API timeout')), API_TIMEOUT)
      )
    ]);

    const data = response.data.values;

    if (!data || data.length <= 1) {
      // No data or only headers - return empty insights
      return {
        hasInsights: false,
        scoreExplanation: null,
        insights: { summary: '', suggestions: [] }
      };
    }

    // Parse the stored insights
    // Format: Timestamp | Game Result | Your Score | Opponent Score | Practice Performance | Score Explanation | Team Insights Summary
    const rows = data.slice(1); // Skip headers

    // Get the most recent row (last row in the sheet)
    const latestRow = rows[rows.length - 1];

    const scoreExplanation = latestRow[5] || null;  // Column F
    const summary = latestRow[6] || '';              // Column G

    return {
      hasInsights: !!(scoreExplanation || summary),
      scoreExplanation,
      insights: { summary, suggestions: [] }
    };

  } catch (error) {
    if (error.code === 400 || error.message?.includes('Unable to parse range')) {
      // Sheet doesn't exist yet
      return {
        hasInsights: false,
        scoreExplanation: null,
        insights: { summary: '', suggestions: [] }
      };
    }
    throw error;
  }
}

/**
 * Save insights to Google Sheets
 */
async function saveInsights(sheets, sheetId, scoreExplanation, insights, gameInfo) {
  const timestamp = new Date().toISOString();

  console.log('🔥🔥🔥 NEW CODE RUNNING - saveInsights function called with:', {
    timestamp,
    gameInfo,
    scoreExplanationLength: scoreExplanation?.length || 0,
    hasInsights: !!insights
  });

  // Check current sheet structure
  let currentHeaders = null;
  let needsMigration = false;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'AIInsights!A1:G1',
    });
    currentHeaders = response.data.values?.[0] || null;

    // Check if we have the correct format
    const expectedFirstColumn = 'Timestamp';
    if (currentHeaders && currentHeaders[0] !== expectedFirstColumn) {
      console.log('📋 Detected old format (first column: "' + currentHeaders[0] + '"), migrating to new format...');
      needsMigration = true;
    } else if (currentHeaders && currentHeaders.length === 7 && currentHeaders[0] === expectedFirstColumn) {
      console.log('📋 Sheet already has correct 7-column format');
    } else {
      // Headers exist but incomplete
      needsMigration = true;
    }
  } catch (error) {
    // Sheet doesn't exist
    if (error.code === 400) {
      console.log('⚠️ Sheet does not exist, creating with 7-column format...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'AIInsights'
              }
            }
          }]
        }
      });
    }
  }

  // If we need to migrate or create new headers
  if (!currentHeaders || needsMigration) {
    console.log('📝 Adding/updating headers to 7-column format...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'AIInsights!A1',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          'Timestamp',
          'Game Result',
          'Your Score',
          'Opponent Score',
          'Practice Performance (1-10)',
          'Score Explanation',
          'Team Insights Summary'
        ]]
      }
    });
    console.log('✅ Headers updated to 7-column format');
  }

  // Prepare rows to write - each analysis creates ONE row with all data
  const rows = [];

  // Create a single row with timestamp, game info, and both AI analyses
  const row = [
    timestamp,
    gameInfo && !gameInfo.skipped ? gameInfo.result : 'N/A',
    gameInfo && !gameInfo.skipped ? gameInfo.yourScore : 'N/A',
    gameInfo && !gameInfo.skipped ? gameInfo.opponentScore : 'N/A',
    gameInfo && !gameInfo.skipped ? gameInfo.practicePerformance : 'N/A',
    scoreExplanation || '',
    insights?.summary || ''
  ];

  rows.push(row);

  console.log('🔥🔥🔥 NEW FORMAT - Prepared rows to append:', JSON.stringify(rows, null, 2));

  // Append the rows
  if (rows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'AIInsights!A:G',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: rows
      }
    });
    console.log('✅ Rows appended to sheet successfully');
  }

  return { success: true };
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  try {
    const SHEET_ID = process.env.VITE_GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      throw new Error('VITE_GOOGLE_SHEET_ID environment variable not set');
    }

    const sheets = await getSheetsClient();

    // GET: Fetch existing insights
    if (req.method === 'GET') {
      const result = await fetchInsights(sheets, SHEET_ID);
      return res.status(200).json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });
    }

    // POST: Save new insights
    if (req.method === 'POST') {
      const { scoreExplanation, insights, gameInfo } = req.body;

      console.log('🔵 API /api/insights POST - Received request body:', {
        hasScoreExplanation: !!scoreExplanation,
        hasInsights: !!insights,
        hasGameInfo: !!gameInfo,
        gameInfo: gameInfo
      });

      if (!scoreExplanation && !insights) {
        return res.status(400).json({
          success: false,
          error: 'At least one of scoreExplanation or insights is required'
        });
      }

      console.log('📝 Calling saveInsights with gameInfo:', gameInfo);
      await saveInsights(sheets, SHEET_ID, scoreExplanation, insights, gameInfo);
      console.log('✅ saveInsights completed');

      return res.status(200).json({
        success: true,
        message: 'Insights saved successfully',
        timestamp: new Date().toISOString()
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET and POST requests are accepted'
    });

  } catch (error) {
    console.error('Error in insights API:', error);

    const statusCode = error.code === 403 ? 403 :
                       error.code === 404 ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      error: 'Failed to process insights',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Unable to process your request'
    });
  }
}
