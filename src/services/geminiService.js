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
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

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
 *
 * @param {number} weeklyScore - Current week's team chemistry score
 * @param {number} baselineScore - Baseline team chemistry score
 * @param {number} difference - Difference between weekly and baseline
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
 * @private
 */
function buildScoreExplanationPrompt(weeklyScore, baselineScore, difference, overallAverage) {
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
Provide a 2-3 paragraph explanation that:
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
 * @returns {Promise<Array>} Array of insight objects
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

    // If no text responses, return empty insights
    if (question1Responses.length === 0 && question7Responses.length === 0) {
      console.log('No text responses to analyze');
      return [];
    }

    // Construct the prompt for Gemini
    const prompt = buildTeamInsightsPrompt(question1Responses, question7Responses, overallScore);

    // Call backend API
    const analysis = await callGeminiAPI(prompt, 'team-insights');

    // Parse the AI response into structured insights
    return parseInsights(analysis);

  } catch (error) {
    console.error('Error analyzing team insights:', error);
    return [];
  }
}

/**
 * Builds the prompt for team insights analysis
 * @private
 */
function buildTeamInsightsPrompt(question1Responses, question7Responses, overallScore) {
  let prompt = `You are a team chemistry expert analyzing open-ended survey responses from a team.

**Overall Team Chemistry Score:** ${overallScore ? overallScore.toFixed(2) : 'N/A'}

Analyze the following responses and provide 3-5 actionable insights about how the open-ended responses relate to and impact the overall team chemistry findings.

`;

  if (question1Responses.length > 0) {
    prompt += `**Question 1 Responses (First open-ended question):**\n`;
    question1Responses.forEach(response => {
      prompt += `- ${response}\n`;
    });
    prompt += `\n`;
  }

  if (question7Responses.length > 0) {
    prompt += `**Question 7 Responses (Last open-ended question):**\n`;
    question7Responses.forEach(response => {
      prompt += `- ${response}\n`;
    });
    prompt += `\n`;
  }

  prompt += `Please provide your analysis in the following JSON format:
{
  "insights": [
    {
      "type": "positive" | "warning" | "critical",
      "category": "communication" | "trust" | "cohesion" | "clarity" | "safety" | "energy" | "general",
      "message": "Brief insight statement",
      "recommendation": "Specific actionable recommendation"
    }
  ]
}

**Guidelines:**
- Connect the qualitative responses to the quantitative score (${overallScore ? overallScore.toFixed(2) : 'overall findings'})
- Identify patterns and themes across multiple responses
- Explain how the open-ended feedback impacts or explains the overall score
- Highlight both strengths and areas for improvement
- Use "positive" for strengths that support the score, "warning" for areas needing attention, "critical" for urgent issues
- Provide specific, actionable recommendations based on the responses
- Keep messages concise and clear

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

    if (parsed.insights && Array.isArray(parsed.insights)) {
      return parsed.insights;
    }

    // If structure is unexpected, return empty array
    console.warn('Unexpected analysis structure:', parsed);
    return [];

  } catch (error) {
    console.error('Error parsing insights:', error);

    // Fallback: try to extract JSON from markdown code blocks
    const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.insights && Array.isArray(parsed.insights)) {
          return parsed.insights;
        }
      } catch (e) {
        console.error('Failed to parse JSON from markdown:', e);
      }
    }

    return [];
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
