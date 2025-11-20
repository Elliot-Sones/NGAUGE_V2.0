/**
 * GEMINI AI SERVICE
 *
 * This service handles communication with Google's Gemini API
 * to generate score explanations - LLM explanation of score variance and trends
 */

/**
 * Core function to call Gemini API through backend proxy
 * @private
 */
async function callGeminiAPI(prompt, type = 'team-insights') {
  // In production (Vercel), VITE_BACKEND_URL should be empty to use relative URLs
  // In development, it should be 'http://localhost:3002'
  const backendUrl = import.meta.env.VITE_BACKEND_URL !== undefined
    ? import.meta.env.VITE_BACKEND_URL
    : (import.meta.env.DEV ? 'http://localhost:3002' : '');

  console.log('Calling Gemini API:', { type, promptLength: prompt.length });

  const response = await fetch(`${backendUrl}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, type }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Backend API error:', {
      status: response.status,
      statusText: response.statusText,
      errorData: errorData,
      message: errorData.message,
      error: errorData.error,
      details: errorData.details
    });
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Gemini API response received:', {
    type,
    analysisLength: data.analysis?.length,
    timestamp: data.timestamp
  });
  return data.analysis;
}

// =============================================================================
// SCORE EXPLANATION
// =============================================================================

/**
 * Generates an LLM explanation of score variance between baseline and weekly scores
 * If no baseline is available, generates explanation based on weekly score only
 *
 * @param {number} weeklyScore - Current week's team chemistry score
 * @param {number|null} baselineScore - Baseline team chemistry score (null if no baseline)
 * @param {number|null} difference - Difference between weekly and baseline (null if no baseline)
 * @param {number} overallAverage - Overall average score across all weeks
 * @param {object|null} gameInfo - Game/practice information (result, scores, performance rating)
 * @returns {Promise<string>} Natural language explanation of the variance
 */
export async function generateScoreExplanation(weeklyScore, baselineScore, difference, overallAverage, gameInfo = null) {
  try {
    const prompt = buildScoreExplanationPrompt(weeklyScore, baselineScore, difference, overallAverage, gameInfo);
    const explanation = await callGeminiAPI(prompt, 'score-explanation');
    return explanation;
  } catch (error) {
    console.error('Error generating score explanation:', error);
    return null;
  }
}

/**
 * Builds the prompt for score explanation analysis
 * Handles both cases: with and without baseline data
 * @private
 */
function buildScoreExplanationPrompt(weeklyScore, baselineScore, difference, overallAverage, gameInfo = null) {
  // Build game info section if available
  let gameInfoSection = '';
  if (gameInfo && !gameInfo.skipped) {
    gameInfoSection = `
**Game/Practice Context:**
- Game Result: ${gameInfo.result}
- Score: ${gameInfo.yourScore} - ${gameInfo.opponentScore}
- Practice Performance Rating: ${gameInfo.practicePerformance}/10
`;
  }

  // If baseline is not available, generate a different prompt
  if (baselineScore === null || difference === null) {
    return `You are an expert sports psychologist. Provide a brief 2-sentence analysis.

**Data:**
- Weekly Score: ${weeklyScore.toFixed(2)}
- Season Average: ${overallAverage.toFixed(2)}${gameInfoSection}

**Task:**
Write exactly 2 concise sentences:
1. Diagnose the team's cohesion level and key psychological factor (e.g., role clarity, trust, collective efficacy)${gameInfo && !gameInfo.skipped ? ', considering the game result and practice performance' : ''}
2. Compare to season average and state what this trend indicates

Be direct and specific. No JSON formatting.`;
  }

  // Standard prompt with baseline comparison
  const percentChange = baselineScore !== 0 ? ((difference / baselineScore) * 100).toFixed(1) : 0;
  const trend = difference > 0 ? 'increased' : difference < 0 ? 'decreased' : 'remained stable';

  return `You are an expert sports psychologist. Provide a brief 2-3 sentence analysis.

**Data:**
- Weekly Score: ${weeklyScore.toFixed(2)}
- Baseline: ${baselineScore.toFixed(2)}
- Change: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)} (${percentChange}%)
- Trend: ${trend}${gameInfoSection}

**Task:**
Write 2-3 concise sentences:
1. Diagnose the significance of this ${Math.abs(percentChange)}% change and the underlying mechanism (e.g., role clarity, trust, collective efficacy)${gameInfo && !gameInfo.skipped ? ', considering the game outcome and practice performance' : ''}
2. State whether this is normal fluctuation (<5%) or meaningful shift (>5%) and what it indicates
3. (Optional) Add one brief insight if the game/practice data reveals something important

Be direct and specific. No JSON formatting.`;
}

