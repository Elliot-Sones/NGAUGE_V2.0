/**
 * CALCULATION LAYER - EASY TO MODIFY
 *
 * All chemistry score calculations and business logic in one place.
 * This modular design makes it simple to update calculation methods.
 *
 * TO MODIFY CALCULATIONS:
 * 1. Update the function implementations below
 * 2. No need to touch components - they'll automatically use new logic!
 *
 * CURRENT IMPLEMENTATION: Simple averages
 * FUTURE: Add weighted averages, complex formulas, ML models, etc.
 */

import { THRESHOLDS, COLORS, TREND_CONFIG } from '../config/constants.js';

/**
 * Calculate average chemistry score for a player
 *
 * CURRENT: Simple arithmetic mean
 *
 * TO MODIFY FOR WEIGHTED AVERAGE:
 * Replace with: scores.reduce((sum, score, idx) => sum + (score * weights[idx]), 0) / totalWeight
 *
 * TO MODIFY FOR CUSTOM FORMULA:
 * Add your own calculation logic here
 *
 * @param {Array<number>} scores - Array of individual question scores
 * @returns {number} Average score (0-100)
 */
export function calculateAverageScore(scores) {
  if (!scores || scores.length === 0) {
    return 0;
  }

  // Filter out invalid scores
  const validScores = scores.filter(score => !isNaN(score) && score !== null && score !== undefined);

  if (validScores.length === 0) {
    return 0;
  }

  // SIMPLE AVERAGE (current implementation)
  const sum = validScores.reduce((acc, score) => acc + parseFloat(score), 0);
  const average = sum / validScores.length;

  return Math.round(average * 10) / 10; // Round to 1 decimal place

  // EXAMPLE: Weighted average (uncomment to use)
  /*
  const weights = [1.5, 1.2, 1.0, 1.3, 1.1]; // Adjust weights for each question
  const weightedSum = validScores.reduce((sum, score, idx) => {
    const weight = weights[idx] || 1;
    return sum + (score * weight);
  }, 0);
  const totalWeight = weights.slice(0, validScores.length).reduce((sum, w) => sum + w, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
  */
}

/**
 * Calculate overall team chemistry
 *
 * @param {Array<Object>} players - Array of player objects
 * @returns {number} Team average score
 */
export function calculateTeamAverage(players) {
  if (!players || players.length === 0) {
    return 0;
  }

  const playerAverages = players.map(player => calculateAverageScore(player.scores));
  return calculateAverageScore(playerAverages);
}

/**
 * Determine color based on score and thresholds
 *
 * TO MODIFY THRESHOLDS:
 * - Update THRESHOLDS in config/constants.js
 * - Or add more granular color levels here
 *
 * @param {number} score - Chemistry score (0-100)
 * @returns {string} Hex color code
 */
export function getScoreColor(score) {
  if (score >= THRESHOLDS.HIGH) {
    return COLORS.HIGH;    // Green - Excellent chemistry
  } else if (score >= THRESHOLDS.MEDIUM) {
    return COLORS.MEDIUM;  // Orange - Good chemistry
  } else {
    return COLORS.LOW;     // Red - Needs improvement
  }

  // EXAMPLE: More granular colors (uncomment to use)
  /*
  if (score >= 90) return '#059669';      // Dark green
  else if (score >= 80) return '#10b981'; // Green
  else if (score >= 70) return '#fbbf24'; // Yellow
  else if (score >= 60) return '#f59e0b'; // Orange
  else if (score >= 50) return '#f97316'; // Dark orange
  else return '#ef4444';                   // Red
  */
}

/**
 * Determine trend direction and magnitude
 *
 * CURRENT: Compares current score to previous score
 *
 * TO MODIFY:
 * - Change TREND_CONFIG.THRESHOLD to adjust sensitivity
 * - Add multi-period trend analysis
 * - Add percentage-based trends
 *
 * @param {number} currentScore - Current chemistry score
 * @param {number} previousScore - Previous chemistry score
 * @returns {Object} { direction: 'up'|'down'|'stable', magnitude: number, color: string }
 */
export function calculateTrend(currentScore, previousScore) {
  if (previousScore === null || previousScore === undefined || isNaN(previousScore)) {
    return {
      direction: 'stable',
      magnitude: 0,
      color: COLORS.NEUTRAL
    };
  }

  const change = currentScore - previousScore;
  const magnitude = Math.abs(change);

  // Only show trend if change exceeds threshold
  if (magnitude < TREND_CONFIG.THRESHOLD) {
    return {
      direction: 'stable',
      magnitude: 0,
      change: 0,
      color: COLORS.NEUTRAL
    };
  }

  // Determine direction and color
  if (change > 0) {
    return {
      direction: 'up',
      magnitude,
      change,
      color: '#10b981'  // Green for improvement
    };
  } else {
    return {
      direction: 'down',
      magnitude,
      change,
      color: '#ef4444'   // Red for decline
    };
  }

  // EXAMPLE: Multi-period trend analysis (uncomment to use)
  /*
  export function calculateMultiPeriodTrend(scores) {
    if (!scores || scores.length < 2) return { direction: 'stable' };

    // Calculate moving average
    const recentAvg = calculateAverageScore(scores.slice(-3));
    const olderAvg = calculateAverageScore(scores.slice(-6, -3));

    const change = recentAvg - olderAvg;
    // ... rest of logic
  }
  */
}

/**
 * Calculate score statistics
 *
 * @param {Array<number>} scores - Array of scores
 * @returns {Object} Statistics object
 */
export function calculateStatistics(scores) {
  if (!scores || scores.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      median: 0,
      stdDev: 0
    };
  }

  const validScores = scores.filter(s => !isNaN(s));
  const sorted = [...validScores].sort((a, b) => a - b);
  const average = calculateAverageScore(validScores);

  // Calculate median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Calculate standard deviation
  const squaredDiffs = validScores.map(score => Math.pow(score - average, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / validScores.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: Math.min(...validScores),
    max: Math.max(...validScores),
    average,
    median: Math.round(median * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10
  };
}

/**
 * Generate insights based on scores
 *
 * PLACEHOLDER: Returns empty array for now
 *
 * TO ADD INSIGHTS:
 * 1. Analyze patterns in the data
 * 2. Return array of insight objects
 * 3. Display in InsightsPanel component
 *
 * @param {Object} playerData - Player data object
 * @returns {Array<Object>} Array of insights
 */
export async function generateInsights(players) {
  // Import the Gemini service dynamically to avoid circular dependencies
  const { analyzeTeamResponses } = await import('../services/geminiService.js');

  try {
    // Call Gemini AI to analyze the open-ended question responses
    const aiInsights = await analyzeTeamResponses(players);
    return aiInsights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return [];
  }
}

/**
 * Get score label (for accessibility and display)
 *
 * @param {number} score - Chemistry score
 * @returns {string} Label describing the score
 */
export function getScoreLabel(score) {
  if (score >= THRESHOLDS.HIGH) {
    return 'Excellent';
  } else if (score >= THRESHOLDS.MEDIUM) {
    return 'Good';
  } else if (score >= 50) {
    return 'Fair';
  } else {
    return 'Needs Improvement';
  }
}

/**
 * Calculate confidence interval for a dataset
 *
 * @param {Array<number>} scores - Array of scores
 * @param {number} confidenceLevel - Confidence level (e.g., 0.95 for 95%)
 * @returns {Object} Confidence interval object
 */
export function calculateConfidenceInterval(scores, confidenceLevel = 0.95) {
  if (!scores || scores.length === 0) {
    return { lower: 0, upper: 0, marginOfError: 0, significant: false };
  }

  const n = scores.length;
  const mean = scores.reduce((sum, score) => sum + score, 0) / n;

  // Calculate standard deviation
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Calculate standard error
  const standardError = stdDev / Math.sqrt(n);

  // Z-score for 95% confidence is 1.96
  const zScore = confidenceLevel === 0.95 ? 1.96 :
                 confidenceLevel === 0.99 ? 2.576 :
                 1.96;

  const marginOfError = zScore * standardError;

  return {
    lower: Math.max(0, mean - marginOfError),
    upper: Math.min(100, mean + marginOfError),
    marginOfError,
    mean,
    significant: marginOfError < 10 // Considered significant if margin is less than 10 points
  };
}

/**
 * Calculate dimension averages from player data
 *
 * @param {Array<Object>} players - Array of player objects
 * @returns {Array<Object>} Array of dimension objects with averages
 */
export function calculateDimensionAverages(players) {
  if (!players || players.length === 0) {
    return [];
  }

  // Get dimension names from first player
  const dimensions = players[0]?.questions || [];

  return dimensions.map((dimensionName, dimensionIndex) => {
    // Collect all scores for this dimension across all players
    const dimensionScores = players
      .map(player => player.scores?.[dimensionIndex])
      .filter(score => typeof score === 'number' && !isNaN(score));

    if (dimensionScores.length === 0) {
      return {
        name: dimensionName,
        average: 0,
        scores: []
      };
    }

    const average = dimensionScores.reduce((sum, score) => sum + score, 0) / dimensionScores.length;

    return {
      name: dimensionName,
      average: Math.round(average * 10) / 10,
      scores: dimensionScores
    };
  });
}

/**
 * FUTURE ENHANCEMENTS TO ADD HERE:
 *
 * 1. Weighted scores by question importance
 * 2. Time-series analysis for trend prediction
 * 3. Outlier detection
 * 4. Correlation analysis between questions
 * 5. Percentile rankings
 * 6. Machine learning predictions
 * 7. Custom business rules
 */
