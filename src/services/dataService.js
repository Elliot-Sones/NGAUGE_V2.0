/**
 * DATA SERVICE LAYER - MODULAR & SWAPPABLE
 *
 * This service handles all data fetching and transformation.
 * It provides a clean interface that makes it easy to swap data sources.
 *
 * CURRENT IMPLEMENTATION: Google Sheets API (client-side)
 *
 * TO SWAP DATA SOURCES:
 * 1. Keep the same function signatures (fetchSheetData, transformData)
 * 2. Replace the implementation inside these functions
 * 3. No need to change any components!
 *
 * EXAMPLES OF OTHER DATA SOURCES:
 * - REST API: Replace fetchSheetData with fetch('your-api-url')
 * - GraphQL: Use Apollo Client or similar
 * - Firebase: Use Firebase SDK
 * - WebSocket: Use WebSocket API for real-time data
 * - CSV file: Use PapaParse or similar
 */

import { GOOGLE_SHEET_ID } from '../config/constants.js';

/**
 * Fetches raw data from Google Sheets
 *
 * @returns {Promise<Array>} Raw sheet data as 2D array
 *
 * TO SWAP: Replace this entire function with your data source
 * Just ensure it returns data in the same format
 */
export async function fetchSheetData() {
  try {
    // Using backend API proxy with service account authentication
    // In production (Vercel), VITE_BACKEND_URL should be empty to use relative URLs
    // In development, it should be 'http://localhost:3002'
    const backendUrl = import.meta.env.VITE_BACKEND_URL !== undefined
      ? import.meta.env.VITE_BACKEND_URL
      : (import.meta.env.DEV ? 'http://localhost:3002' : '');
    const url = `${backendUrl}/api/sheets`;

    console.log('Fetching data from backend API:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Data fetched successfully:', data.rowCount, 'rows');

    return data.values || [];

  } catch (error) {
    console.error('Error fetching sheet data:', error);
    // Fallback to mock data in development
    if (import.meta.env.DEV) {
      console.warn('Backend unavailable, using mock data for development');
      return getMockData();
    }
    throw error;
  }
}

/**
 * Fetches baseline data from Google Sheets "Baseline" sheet
 * Returns null if baseline sheet doesn't exist or is empty
 *
 * @returns {Promise<Object|null>} Baseline scores object or null
 */
export async function fetchBaselineData() {
  try {
    // In production (Vercel), VITE_BACKEND_URL should be empty to use relative URLs
    // In development, it should be 'http://localhost:3002'
    const backendUrl = import.meta.env.VITE_BACKEND_URL !== undefined
      ? import.meta.env.VITE_BACKEND_URL
      : (import.meta.env.DEV ? 'http://localhost:3002' : '');
    const url = `${backendUrl}/api/baseline`;

    console.log('Fetching baseline data from backend API:', url);

    const response = await fetch(url);

    // Parse response body once
    const data = await response.json();

    // Check for errors in the response data
    if (!response.ok) {
      if (data.success === false) {
        throw new Error(data.message || `API error: ${response.status}`);
      }
    }

    // Check if baseline data exists
    if (!data.hasBaseline || !data.values || data.values.length === 0) {
      console.log('No baseline data found - will show weekly scores only');
      return null;
    }

    console.log('Baseline data fetched successfully:', data.rowCount, 'rows');

    // Transform baseline data into dimension scores
    return transformBaselineData(data.values);

  } catch (error) {
    console.error('Error fetching baseline data:', error);
    // Return null instead of throwing - missing baseline is not a fatal error
    return null;
  }
}

/**
 * Transforms raw baseline sheet data into dimension scores object
 *
 * EXPECTED BASELINE SHEET FORMAT (Monthly template):
 * Row 1: Headers
 *   Column A: Player ID
 *   Column B: Trust (Collective efficacy)
 *   Column C: Alignment (Task Cohesion)
 *   Column D: Role clarity
 *   Column E: Connection (Trust between teammates)
 *   Column F: Psychological safety
 *   Column G: Overall moral/motivation
 *   Column H: Communication quality
 * Row 2+: Baseline player data
 *
 * @param {Array} rawData - 2D array from Google Sheets
 * @returns {Object} Baseline scores by dimension name
 */
function transformBaselineData(rawData) {
  if (!rawData || rawData.length < 2) {
    console.log('Insufficient baseline data to transform (need at least 2 rows: header + data)');
    return null;
  }

  // Skip headers row, get player data
  const playerRows = rawData.slice(1);

  // Extra validation: ensure we have actual data rows
  if (playerRows.length === 0) {
    console.log('No baseline data rows found (only headers present)');
    return null;
  }

  console.log(`Processing baseline data: ${playerRows.length} players`);

  // Monthly template column mapping (0-indexed)
  // Column A (0): Player ID - skip
  // Column B (1): Trust (Collective efficacy)
  // Column C (2): Alignment (Task Cohesion)
  // Column D (3): Role clarity
  // Column E (4): Connection (Trust between teammates)
  // Column F (5): Psychological safety
  // Column G (6): Overall moral/motivation (Energy/Motivation)
  // Column H (7): Communication quality

  const columnMapping = {
    'Collective Efficacy': 1,      // Column B
    'Task Cohesion': 2,            // Column C
    'Role Clarity': 3,             // Column D
    'Trust': 4,                    // Column E
    'Psychological Safety': 5,     // Column F
    'Energy/Motivation': 6,        // Column G
    'Communication Quality': 7      // Column H
  };

  const dimensionNames = [
    'Collective Efficacy',
    'Task Cohesion',
    'Role Clarity',
    'Trust',
    'Psychological Safety',
    'Communication Quality',
    'Energy/Motivation'
  ];

  const baselineScores = {};

  // Calculate average for each dimension across all baseline players
  dimensionNames.forEach(dimensionName => {
    const columnIndex = columnMapping[dimensionName];

    const scores = playerRows
      .map(row => {
        const value = row[columnIndex];
        const parsed = parseFloat(value);

        // Convert 1-9 scale to 0-100 scale
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 9) {
          return ((parsed - 1) / 8) * 100;
        }

        // If already in 0-100 range, keep it
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          return parsed;
        }

        return null;
      })
      .filter(score => score !== null && !isNaN(score));

    if (scores.length > 0) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      baselineScores[dimensionName] = average;
    } else {
      baselineScores[dimensionName] = 0;
    }
  });

  console.log('Baseline scores calculated:', baselineScores);

  return baselineScores;
}

/**
 * Transforms raw sheet data into structured player data
 *
 * EXPECTED SHEET FORMAT:
 * Row 1: Headers (Question1, Question2, Question3, ...)
 * Row 2+: Player data (PlayerName, score1, score2, score3, ...)
 *
 * @param {Array} rawData - 2D array from Google Sheets
 * @returns {Array<Object>} Structured player objects
 *
 * TO MODIFY:
 * - Change this function if your data structure is different
 * - The output format should remain consistent for components to work
 */
export function transformData(rawData) {
  if (!rawData || rawData.length < 2) {
    console.warn('Insufficient data to transform');
    return [];
  }

  // First row contains headers
  const headers = rawData[0];
  const playerRows = rawData.slice(1);

  // WEEKLY SHEET COLUMN STRUCTURE:
  // Column 0: Timestamp
  // Column 1: Q1 - How do you feel the week went? (text - CAPTURE for AI analysis)
  // Column 2: Q2 - Collective Efficacy (1-10)
  // Column 3: Q3 - Task Cohesion (1-10)
  // Column 4: Q4 - Role clarity (1-10)
  // Column 5: Q5 - Trust between teammates (1-10)
  // Column 6: Q6 - Psychological safety (1-10)
  // Column 7: Q7 - Feedback openness (1-10)
  // Column 8: Q8 - Energy/commitment (1-10)
  // Column 9: Q9 - Additional comments (text - CAPTURE for AI analysis)

  const numericColumns = [2, 3, 4, 5, 6, 7, 8]; // Indices for the 7 chemistry dimensions

  return playerRows.map((row, index) => {
    // Use "Response #" instead of player name since we have timestamps, not player IDs
    const playerName = `Response ${index + 1}`;
    const timestamp = row[0] || '';

    const scores = numericColumns.map(colIndex => {
      const value = row[colIndex];
      const parsed = parseFloat(value);

      // Convert 1-7 scale to 0-100 scale
      // Formula: (score - 1) / (7 - 1) * 100 = (score - 1) / 6 * 100
      // This makes 1 = 0%, 4 = 50%, 7 = 100%
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) {
        return ((parsed - 1) / 6) * 100;
      }

      // If already in 0-100 range, keep it
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed;
      }

      return 0;
    });

    // Hardcoded dimension names for FINDINGS section (cleaner than full question text)
    const questions = [
      'Collective Efficacy',      // Q2
      'Task Cohesion',            // Q3
      'Role Clarity',             // Q4
      'Trust',                    // Q5
      'Psychological Safety',     // Q6
      'Communication Quality',    // Q7
      'Energy/Motivation'         // Q8
    ];

    // Create question-score pairs
    const responses = questions.map((question, idx) => ({
      question,
      score: scores[idx] || 0
    }));

    // Capture open-ended text answers for AI analysis
    const question1Answer = row[1] || '';  // How do you feel the week went?
    const question9Answer = row[9] || '';  // Additional comments

    return {
      id: `response-${index}`,
      name: playerName,
      timestamp,
      scores,
      responses,
      questions,  // Use actual question headers from the sheet
      question1Answer,  // Open-ended text from column 1
      question7Answer: question9Answer,  // Open-ended text from column 9 (renamed for compatibility)
      rawData: row
    };
  });
}

/**
 * Main function to get processed data
 * This is the primary function components should use
 *
 * @returns {Promise<Array>} Transformed player data
 */
export async function getChemistryData() {
  const rawData = await fetchSheetData();
  return transformData(rawData);
}

/**
 * Mock data for development and testing
 * Remove or modify based on your needs
 */
function getMockData() {
  return [
    // Headers
    ['Player', 'Team Communication', 'Trust Level', 'Conflict Resolution', 'Shared Goals', 'Support'],
    // Player data
    ['John Smith', '85', '92', '78', '88', '90'],
    ['Sarah Johnson', '75', '80', '85', '72', '78'],
    ['Mike Williams', '90', '88', '92', '95', '91'],
    ['Emily Davis', '65', '70', '68', '75', '72'],
    ['Chris Brown', '88', '85', '90', '87', '89']
  ];
}

/**
 * Fetches stored AI insights from Google Sheets
 * @returns {Promise<Object>} Object with hasInsights, scoreExplanation, and insights
 */
export async function fetchStoredInsights() {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL !== undefined
      ? import.meta.env.VITE_BACKEND_URL
      : (import.meta.env.DEV ? 'http://localhost:3002' : '');
    const url = `${backendUrl}/api/insights`;

    console.log('Fetching stored insights from backend API:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Stored insights fetched:', data.hasInsights ? 'Found' : 'Not found');

    return data;

  } catch (error) {
    console.error('Error fetching stored insights:', error);
    // Return empty insights on error
    return {
      hasInsights: false,
      scoreExplanation: null,
      insights: { summary: '', suggestions: [] }
    };
  }
}

/**
 * Fetches the most recent game info from Google Sheets AIInsights tab
 * @returns {Promise<Object|null>} Latest game info or null if no data
 */
export async function fetchLatestGameInfo() {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL !== undefined
      ? import.meta.env.VITE_BACKEND_URL
      : (import.meta.env.DEV ? 'http://localhost:3002' : '');
    const url = `${backendUrl}/api/insights/latest-game-info`;

    console.log('Fetching latest game info from backend API:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Latest game info fetched:', data);

    return data.gameInfo;

  } catch (error) {
    console.error('Error fetching latest game info:', error);
    return null;
  }
}

/**
 * Saves AI insights to Google Sheets
 * @param {string|null} scoreExplanation - Score explanation text
 * @param {Object} insights - Insights object with summary and suggestions
 * @param {Object|null} gameInfo - Game/practice information
 * @returns {Promise<boolean>} Success status
 */
export async function saveInsights(scoreExplanation, insights, gameInfo = null) {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL !== undefined
      ? import.meta.env.VITE_BACKEND_URL
      : (import.meta.env.DEV ? 'http://localhost:3002' : '');
    const url = `${backendUrl}/api/insights`;

    const payload = { scoreExplanation, insights, gameInfo };
    console.log('💾 dataService.saveInsights - Sending to backend:', url);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Backend API error:', errorData);
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Insights saved successfully:', result);
    return true;

  } catch (error) {
    console.error('❌ Error saving insights:', error);
    return false;
  }
}

/**
 * FUTURE ENHANCEMENTS:
 *
 * 1. Add caching layer:
 *    - Store data in localStorage or IndexedDB
 *    - Reduce API calls
 *
 * 2. Add WebSocket support:
 *    - Real-time updates instead of polling
 *    - More efficient than HTTP polling
 *
 * 3. Add data validation:
 *    - Validate schema
 *    - Handle missing data gracefully
 *
 * 4. Add error retry logic:
 *    - Exponential backoff
 *    - Better error handling
 */
