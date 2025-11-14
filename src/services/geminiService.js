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
    console.error('Backend API error:', {
      status: response.status,
      statusText: response.statusText,
      errorData
    });
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
    return `You are an expert sports psychologist specializing in team dynamics and group cohesion. Your role is to help coaches understand team chemistry patterns through evidence-based analysis.

**Current Data:**
- Weekly Team Chemistry Score: ${weeklyScore.toFixed(2)}
- Overall Season Average: ${overallAverage.toFixed(2)}

**Your Expertise:**
Apply principles from Carron's Group Environment Questionnaire and Tuckman's team development model to interpret this data.

**Analysis Task:**
Provide a concise 3-4 sentence diagnostic analysis that:
1. Identifies what this score reveals about the team's current cohesion level (forming, storming, norming, or performing stage)
2. Compares the weekly score to the season average and diagnoses the underlying team dynamic this suggests
3. Pinpoints the most likely psychological factor at play (e.g., collective efficacy, task cohesion, role ambiguity, trust deficit)
4. Offers one evidence-based insight about what this pattern typically indicates in high-performing teams

**Analytical Framework:**
- Use diagnostic language that identifies root patterns, not just symptoms
- Reference psychological mechanisms (e.g., "This suggests role ambiguity affecting task cohesion" vs. "communication needs work")
- Connect numerical data to established team development theory
- Maintain professional objectivity—avoid overly positive or negative framing

**Output:**
Provide your analysis as plain text (no JSON formatting needed). Be direct and insightful without unnecessary qualifiers.`;
  }

  // Standard prompt with baseline comparison
  const percentChange = baselineScore !== 0 ? ((difference / baselineScore) * 100).toFixed(1) : 0;
  const trend = difference > 0 ? 'increased' : difference < 0 ? 'decreased' : 'remained stable';

  return `You are an expert sports psychologist specializing in team dynamics and group cohesion. Your role is to help coaches understand team chemistry patterns through evidence-based analysis.

**Current Data:**
- Weekly Team Chemistry Score: ${weeklyScore.toFixed(2)}
- Baseline Score: ${baselineScore.toFixed(2)}
- Change: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)} (${percentChange}%)
- Overall Season Average: ${overallAverage.toFixed(2)}
- Trend Direction: ${trend}

**Your Expertise:**
Apply principles from Carron's Group Environment Questionnaire, Tuckman's team development model, and cohesion research to interpret this variance.

**Analysis Task:**
Provide a concise 3-4 sentence diagnostic analysis that:
1. Diagnoses the psychological significance of this ${Math.abs(percentChange)}% change in team chemistry
2. Identifies the most likely underlying mechanism driving this shift (e.g., role transitions, trust building/erosion, collective efficacy changes, or environmental stressors)
3. Contextualizes whether this variance falls within normal developmental fluctuation or signals a meaningful team dynamic shift
4. Connects this pattern to established research on team cohesion trajectories

**Analytical Framework:**
- Use diagnostic language that identifies root psychological patterns, not just symptoms
- Reference specific team dynamics mechanisms (e.g., "This shift likely reflects increased role clarity enhancing task cohesion" vs. "team is improving")
- Apply research-backed thresholds: <5% = minor fluctuation, 5-10% = notable shift, >10% = significant change
- Maintain professional objectivity—focus on what the data reveals, not what the coach wants to hear

**Output:**
Provide your analysis as plain text (no JSON formatting needed). Be direct and insightful without unnecessary qualifiers.`;
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
  let prompt = `You are an expert sports psychologist specializing in team dynamics and group cohesion analysis. Your role is to help coaches diagnose underlying team chemistry patterns from player feedback.

**Overall Team Chemistry Score:** ${overallScore ? overallScore.toFixed(2) : 'N/A'}

**Psychological Framework:**
Apply Carron's Group Dynamics Model (task cohesion, social cohesion, individual attractions to group) and assess team functioning across these research-validated dimensions:
- Collective Efficacy (team's shared belief in capability)
- Task Cohesion (alignment toward common goals)
- Role Clarity (understanding of responsibilities)
- Trust & Psychological Safety (interpersonal security)
- Communication Quality (information flow effectiveness)
- Energy/Motivation (team drive and resilience)

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

  prompt += `**Diagnostic Analysis Task:**

1. **Pattern Identification (playerNotesSummary):**
   - Write 3-4 sentences identifying the core psychological patterns emerging from responses
   - Diagnose which of the 6 team chemistry dimensions show strength or concern
   - Connect player language to underlying team dynamic mechanisms (e.g., "References to 'confusion about plays' suggest role clarity issues affecting task cohesion")
   - Note psychological climate indicators (e.g., defensive language = low psychological safety, "we" vs "I" language = collective identity strength)

2. **Diagnostic Recommendations (suggestions):**
   - Provide 1-2 targeted interventions based on identified patterns
   - Each suggestion must:
     * Target a specific diagnosed dimension (e.g., "Role Clarity," "Psychological Safety," "Task Cohesion")
     * Offer an evidence-based intervention tied to the diagnosis
     * Be implementable within normal coaching operations
   - Prioritize interventions by impact potential—address root causes, not symptoms

**Response Format (JSON):**
{
  "playerNotesSummary": "3-4 sentence diagnostic summary identifying core patterns and mechanisms",
  "suggestions": [
    {
      "topic": "Specific team chemistry dimension diagnosed (e.g., Role Clarity, Trust, Communication Quality)",
      "suggestion": "Evidence-based intervention tied directly to the diagnosed pattern. Format: 'Consider [specific action] to address [diagnosed mechanism], which research shows [expected outcome].'"
    }
  ]
}

**Analytical Standards:**
- Be diagnostic, not descriptive—identify WHY patterns exist, not just WHAT was said
- Use precise psychological terminology (e.g., "role ambiguity," "trust deficit," "collective efficacy gap")
- Connect observations to team chemistry dimensions explicitly
- Avoid generic advice—tie every suggestion to specific evidence from responses
- Maintain professional objectivity—diagnose accurately even if findings are uncomfortable
- Focus on actionable psychological mechanisms coaches can influence

**Quality Criteria:**
✓ Diagnosis reveals underlying team dynamic mechanisms
✓ Suggestions target root psychological factors, not surface symptoms
✓ Language is professional but accessible (no academic jargon overload)
✓ Insights are specific to THIS team's responses (not generic team advice)
✓ Recommendations are practical for coaching contexts

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
