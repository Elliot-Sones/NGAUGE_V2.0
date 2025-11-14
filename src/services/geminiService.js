/**
 * GEMINI AI SERVICE
 *
 * This service handles communication with Google's Gemini API
 * to generate two types of analysis:
 * 1. Score Explanation - LLM explanation of score variance and trends
 * 2. Team Insights - AI-powered team chemistry insights from open-ended responses
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
// ANALYSIS TYPE 1: SCORE EXPLANATION
// =============================================================================

/**
 * Generates an LLM explanation of score variance between baseline and weekly scores
 * If no baseline is available, generates explanation based on weekly score only
 *
 * @param {number} weeklyScore - Current week's team chemistry score
 * @param {number|null} baselineScore - Baseline team chemistry score (null if no baseline)
 * @param {number|null} difference - Difference between weekly and baseline (null if no baseline)
 * @param {number} overallAverage - Overall average score across all weeks
 * @returns {Promise<string>} Natural language explanation of the variance
 */
export async function generateScoreExplanation(weeklyScore, baselineScore, difference, overallAverage) {
  try {
    const prompt = buildScoreExplanationPrompt(weeklyScore, baselineScore, difference, overallAverage);
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
function buildScoreExplanationPrompt(weeklyScore, baselineScore, difference, overallAverage) {
  // If baseline is not available, generate a different prompt
  if (baselineScore === null || difference === null) {
    return `You are an expert sports psychologist. Provide a brief 2-sentence analysis.

**Data:**
- Weekly Score: ${weeklyScore.toFixed(2)}
- Season Average: ${overallAverage.toFixed(2)}

**Task:**
Write exactly 2 concise sentences:
1. Diagnose the team's cohesion level and key psychological factor (e.g., role clarity, trust, collective efficacy)
2. Compare to season average and state what this trend indicates

Be direct and specific. No JSON formatting.`;
  }

  // Standard prompt with baseline comparison
  const percentChange = baselineScore !== 0 ? ((difference / baselineScore) * 100).toFixed(1) : 0;
  const trend = difference > 0 ? 'increased' : difference < 0 ? 'decreased' : 'remained stable';

  return `You are an expert sports psychologist. Provide a brief 2-sentence analysis.

**Data:**
- Weekly Score: ${weeklyScore.toFixed(2)}
- Baseline: ${baselineScore.toFixed(2)}
- Change: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)} (${percentChange}%)
- Trend: ${trend}

**Task:**
Write exactly 2 concise sentences:
1. Diagnose the significance of this ${Math.abs(percentChange)}% change and the underlying mechanism (e.g., role clarity, trust, collective efficacy)
2. State whether this is normal fluctuation (<5%) or meaningful shift (>5%) and what it indicates

Be direct and specific. No JSON formatting.`;
}

// =============================================================================
// ANALYSIS TYPE 2: TEAM INSIGHTS
// =============================================================================

/**
 * Analyzes team responses using Gemini AI to generate insights
 *
 * @param {Array} players - Array of player objects with question1Answer and question7Answer
 * @param {number} overallScore - Overall team chemistry score
 * @returns {Promise<Object>} Object with summary and suggestions array
 */
export async function analyzeTeamInsights(players, overallScore) {
  try {
    // Extract text responses from all players
    const question1Responses = players
      .filter(p => p.question1Answer && p.question1Answer.trim())
      .map(p => `${p.name}: "${p.question1Answer}"`);

    const question7Responses = players
      .filter(p => p.question7Answer && p.question7Answer.trim())
      .map(p => `${p.name}: "${p.question7Answer}"`);

    // If no text responses, return empty structure
    if (question1Responses.length === 0 && question7Responses.length === 0) {
      console.log('No text responses to analyze');
      return { summary: '', suggestions: [] };
    }

    // Construct the prompt for Gemini
    const prompt = buildTeamInsightsPrompt(question1Responses, question7Responses, overallScore);

    // Call backend API
    const analysis = await callGeminiAPI(prompt, 'team-insights');

    // Parse the AI response into structured insights
    return parseInsights(analysis);

  } catch (error) {
    console.error('Error analyzing team insights:', error);
    return { summary: '', suggestions: [] };
  }
}

/**
 * Builds the prompt for team insights analysis
 * @private
 */
function buildTeamInsightsPrompt(question1Responses, question7Responses, overallScore) {
  let prompt = `You are an expert sports psychologist. Analyze player feedback and provide brief, actionable insights.

**Team Score:** ${overallScore ? overallScore.toFixed(2) : 'N/A'}

**Focus Areas:** Collective Efficacy, Task Cohesion, Role Clarity, Trust, Psychological Safety, Communication, Energy/Motivation

`;

  if (question1Responses.length > 0) {
    prompt += `**How the week went:**\n`;
    question1Responses.forEach(response => {
      prompt += `- ${response}\n`;
    });
    prompt += `\n`;
  }

  if (question7Responses.length > 0) {
    prompt += `**Additional comments:**\n`;
    question7Responses.forEach(response => {
      prompt += `- ${response}\n`;
    });
    prompt += `\n`;
  }

  prompt += `**Task:**

1. **playerNotesSummary:** Write 2-3 SHORT sentences identifying key patterns and which dimensions need attention

2. **suggestions:** Provide 1-2 specific, actionable recommendations
   - Format: {"topic": "Dimension name", "suggestion": "Brief action to address the issue"}
   - Keep suggestions under 25 words each
   - Be specific and practical

**Response Format (JSON):**
{
  "playerNotesSummary": "2-3 brief sentences on patterns and dimensions",
  "suggestions": [
    {
      "topic": "Dimension name",
      "suggestion": "Brief specific action under 25 words"
    }
  ]
}

Be concise and actionable. Return ONLY the JSON object.`;

  return prompt;
}

// =============================================================================
// RESPONSE PARSERS
// =============================================================================

/**
 * Parses Gemini's response into structured insight objects
 * @private
 */
function parseInsights(analysisText) {
  // First, try to extract JSON from markdown code blocks (most common case with Gemini)
  const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    analysisText.match(/```\s*([\s\S]*?)\s*```/);

  let textToParse = analysisText;

  if (jsonMatch) {
    textToParse = jsonMatch[1].trim();
  }

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(textToParse);

    // Return the new structure with summary and suggestions
    if (parsed.playerNotesSummary !== undefined && parsed.suggestions && Array.isArray(parsed.suggestions)) {
      return {
        summary: parsed.playerNotesSummary || '',
        suggestions: parsed.suggestions
      };
    }

    // If structure is unexpected, return empty structure
    console.warn('Unexpected analysis structure:', parsed);
    return { summary: '', suggestions: [] };

  } catch (error) {
    console.error('Error parsing insights:', error);
    console.error('Raw response:', analysisText);
    return { summary: '', suggestions: [] };
  }
}

// =============================================================================
// BACKWARDS COMPATIBILITY
// =============================================================================

/**
 * Legacy function name for backwards compatibility
 * @deprecated Use analyzeTeamInsights instead
 */
export async function analyzeTeamResponses(players) {
  return analyzeTeamInsights(players, null);
}
