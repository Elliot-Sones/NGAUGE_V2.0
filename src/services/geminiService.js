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

  const response = await fetch(`${backendUrl}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, type }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  const data = await response.json();
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
    return `You are a team performance analyst. Explain the team chemistry score in a clear, professional manner.

**Current Data:**
- Weekly Score: ${weeklyScore.toFixed(2)}
- Overall Average: ${overallAverage.toFixed(2)}

**Task:**
Provide a 2-3 sentence explanation that:
1. Interprets what the weekly score indicates about team chemistry
2. Discusses how this score compares to the overall average
3. Provides context on whether this is a strong, moderate, or concerning score
4. Offers brief insight into what this score might indicate about team dynamics

**Tone:**
- Professional and analytical
- Data-driven but accessible
- Balanced (acknowledge both positive and concerning aspects)
- Concise and actionable

Please provide your explanation as plain text (no JSON formatting needed).`;
  }

  // Standard prompt with baseline comparison
  const percentChange = baselineScore !== 0 ? ((difference / baselineScore) * 100).toFixed(1) : 0;
  const trend = difference > 0 ? 'increased' : difference < 0 ? 'decreased' : 'remained stable';

  return `You are a team performance analyst. Explain the variance in team chemistry scores in a clear, professional manner.

**Current Data:**
- Weekly Score: ${weeklyScore.toFixed(2)}
- Baseline Score: ${baselineScore.toFixed(2)}
- Difference: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)} (${percentChange}%)
- Overall Average: ${overallAverage.toFixed(2)}
- Trend: Score has ${trend}

**Task:**
Provide a 2-3 sentence explanation that:
1. Interprets what the variance between baseline and weekly score means
2. Discusses how this variance could affect the overall average score
3. Provides context on whether this is a significant change or within normal range
4. Offers brief insight into what this trend might indicate about team dynamics

**Tone:**
- Professional and analytical
- Data-driven but accessible
- Balanced (acknowledge both positive and concerning aspects)
- Concise and actionable

Please provide your explanation as plain text (no JSON formatting needed).`;
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
  let prompt = `You are a team chemistry expert analyzing open-ended survey responses from a sports team.

**Overall Team Chemistry Score:** ${overallScore ? overallScore.toFixed(2) : 'N/A'}

**Your Task:**
1. Write a brief 2-3 sentence summary of what the coach should know from player responses
2. Provide 1-2 specific suggestions for areas to improve

`;

  if (question1Responses.length > 0) {
    prompt += `**Question 1 Responses (How do you feel the week went?):**\n`;
    question1Responses.forEach(response => {
      prompt += `- ${response}\n`;
    });
    prompt += `\n`;
  }

  if (question7Responses.length > 0) {
    prompt += `**Question 9 Responses (Additional comments):**\n`;
    question7Responses.forEach(response => {
      prompt += `- ${response}\n`;
    });
    prompt += `\n`;
  }

  prompt += `**Response Format (JSON):**
{
  "playerNotesSummary": "2-3 sentence summary highlighting key themes and what the coach should know",
  "suggestions": [
    {
      "topic": "Area to improve (e.g., Communication, Role Clarity, Trust)",
      "suggestion": "Specific actionable recommendation to help improve this area"
    }
  ]
}

**Guidelines:**
- Keep playerNotesSummary concise (2-3 sentences max)
- Provide 1-2 suggestions (not more)
- Each suggestion should have a clear topic and actionable recommendation
- Focus on practical, implementable actions
- Connect insights to the responses when possible

Return ONLY the JSON object, no additional text.`;

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
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(analysisText);

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

    // Fallback: try to extract JSON from markdown code blocks
    const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.playerNotesSummary !== undefined && parsed.suggestions && Array.isArray(parsed.suggestions)) {
          return {
            summary: parsed.playerNotesSummary || '',
            suggestions: parsed.suggestions
          };
        }
      } catch (e) {
        console.error('Failed to parse JSON from markdown:', e);
      }
    }

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
