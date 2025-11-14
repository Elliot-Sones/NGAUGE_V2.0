/**
 * Vercel Serverless Function: /api/insights
 *
 * Manages AI-generated insights storage in Google Sheets
 * - GET: Fetches stored insights from "AIInsights" sheet
 * - POST: Saves new insights to "AIInsights" sheet
 *
 * SHEET STRUCTURE (AIInsights):
 * Row 1: Headers [Type, Content, Timestamp]
 * Row 2: score_explanation, <text>, <timestamp>
 * Row 3: team_insights_summary, <text>, <timestamp>
 * Row 4+: team_insights_suggestion_N, <json>, <timestamp>
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
        range: 'AIInsights!A:C',
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
    const rows = data.slice(1); // Skip headers
    let scoreExplanation = null;
    let summary = '';
    const suggestions = [];

    rows.forEach(row => {
      const type = row[0];
      const content = row[1];

      if (type === 'score_explanation') {
        scoreExplanation = content || null;
      } else if (type === 'team_insights_summary') {
        summary = content || '';
      } else if (type && type.startsWith('team_insights_suggestion_')) {
        try {
          const suggestion = JSON.parse(content);
          suggestions.push(suggestion);
        } catch (e) {
          console.error('Error parsing suggestion:', e);
        }
      }
    });

    return {
      hasInsights: true,
      scoreExplanation,
      insights: { summary, suggestions }
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
async function saveInsights(sheets, sheetId, scoreExplanation, insights) {
  const timestamp = new Date().toISOString();

  // Prepare rows to write
  const rows = [
    ['Type', 'Content', 'Timestamp'] // Headers
  ];

  // Add score explanation
  if (scoreExplanation) {
    rows.push(['score_explanation', scoreExplanation, timestamp]);
  }

  // Add team insights summary
  if (insights.summary) {
    rows.push(['team_insights_summary', insights.summary, timestamp]);
  }

  // Add suggestions
  if (insights.suggestions && insights.suggestions.length > 0) {
    insights.suggestions.forEach((suggestion, index) => {
      rows.push([
        `team_insights_suggestion_${index}`,
        JSON.stringify(suggestion),
        timestamp
      ]);
    });
  }

  // First, try to clear existing data
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'AIInsights!A:C',
    });
  } catch (error) {
    // If sheet doesn't exist, create it
    if (error.code === 400) {
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

  // Write new data
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'AIInsights!A1',
    valueInputOption: 'RAW',
    resource: {
      values: rows
    }
  });

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
      const { scoreExplanation, insights } = req.body;

      if (!scoreExplanation && !insights) {
        return res.status(400).json({
          success: false,
          error: 'At least one of scoreExplanation or insights is required'
        });
      }

      await saveInsights(sheets, SHEET_ID, scoreExplanation, insights);

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
