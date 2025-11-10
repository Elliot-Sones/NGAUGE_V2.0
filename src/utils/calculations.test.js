/**
 * Unit Tests for Calculation Functions
 *
 * Tests the core business logic for team chemistry scoring
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAverageScore,
  calculateTeamAverage,
  getScoreColor,
  calculateTrend,
  calculateStatistics,
  calculateDimensionAverages,
} from './calculations';

describe('calculateAverageScore', () => {
  it('should calculate average of valid scores', () => {
    const scores = [80, 90, 70];
    expect(calculateAverageScore(scores)).toBe(80.0);
  });

  it('should handle single score', () => {
    const scores = [75.5];
    expect(calculateAverageScore(scores)).toBe(75.5);
  });

  it('should filter out invalid scores (NaN)', () => {
    const scores = [80, NaN, 90];
    expect(calculateAverageScore(scores)).toBe(85.0);
  });

  it('should return 0 for empty array', () => {
    expect(calculateAverageScore([])).toBe(0);
  });

  it('should return 0 for all NaN values', () => {
    expect(calculateAverageScore([NaN, NaN])).toBe(0);
  });

  it('should round to 1 decimal place', () => {
    const scores = [80.555, 90.444];
    expect(calculateAverageScore(scores)).toBe(85.5);
  });
});

describe('calculateTeamAverage', () => {
  it('should calculate team average from player data', () => {
    const players = [
      { scores: [80, 90, 70] },
      { scores: [85, 75, 95] },
    ];
    const result = calculateTeamAverage(players);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTeamAverage([])).toBe(0);
  });

  it('should handle single player', () => {
    const players = [{ scores: [80, 90, 70] }];
    expect(calculateTeamAverage(players)).toBe(80.0);
  });
});

describe('getScoreColor', () => {
  it('should return green for elite scores (>= 80)', () => {
    expect(getScoreColor(80)).toBe('#10b981');
    expect(getScoreColor(100)).toBe('#10b981');
  });

  it('should return orange for average scores (60-79)', () => {
    expect(getScoreColor(60)).toBe('#f59e0b');
    expect(getScoreColor(70)).toBe('#f59e0b');
    expect(getScoreColor(79)).toBe('#f59e0b');
  });

  it('should return red for below average scores (< 60)', () => {
    expect(getScoreColor(59)).toBe('#ef4444');
    expect(getScoreColor(30)).toBe('#ef4444');
    expect(getScoreColor(0)).toBe('#ef4444');
  });

  it('should handle edge cases', () => {
    expect(getScoreColor(79.9)).toBe('#f59e0b');
    expect(getScoreColor(80.0)).toBe('#10b981');
    expect(getScoreColor(59.9)).toBe('#ef4444');
  });
});

describe('calculateTrend', () => {
  it('should detect upward trend', () => {
    const result = calculateTrend(85, 80);
    expect(result.direction).toBe('up');
    expect(result.magnitude).toBe(5);
    expect(result.color).toBe('#10b981');
  });

  it('should detect downward trend', () => {
    const result = calculateTrend(75, 80);
    expect(result.direction).toBe('down');
    expect(result.magnitude).toBe(5);
    expect(result.color).toBe('#ef4444');
  });

  it('should detect stable trend for small changes', () => {
    const result = calculateTrend(80.3, 80);
    expect(result.direction).toBe('stable');
    expect(result.color).toBe('#6b7280');
  });

  it('should handle null previous score', () => {
    const result = calculateTrend(80, null);
    expect(result.direction).toBe('stable');
  });

  it('should use threshold from constants', () => {
    // Trend threshold is 0.5 by default
    const resultStable = calculateTrend(80.4, 80);
    expect(resultStable.direction).toBe('stable');
  });
});

describe('calculateStatistics', () => {
  it('should calculate all statistics correctly', () => {
    const scores = [70, 80, 90, 85, 75];
    const stats = calculateStatistics(scores);

    expect(stats.min).toBe(70);
    expect(stats.max).toBe(90);
    expect(stats.average).toBe(80);
    expect(stats.median).toBe(80);
    expect(stats.stdDev).toBeGreaterThan(0);
  });

  it('should handle single value', () => {
    const stats = calculateStatistics([85]);
    expect(stats.min).toBe(85);
    expect(stats.max).toBe(85);
    expect(stats.average).toBe(85);
    expect(stats.median).toBe(85);
    expect(stats.stdDev).toBe(0);
  });

  it('should handle even number of values for median', () => {
    const scores = [70, 80, 90, 100];
    const stats = calculateStatistics(scores);
    expect(stats.median).toBe(85); // Average of 80 and 90
  });

  it('should return zeros for empty array', () => {
    const stats = calculateStatistics([]);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.average).toBe(0);
    expect(stats.median).toBe(0);
  });
});

describe('calculateDimensionAverages', () => {
  it('should calculate averages for all dimensions', () => {
    const players = [
      {
        questions: ['Collective Efficacy', 'Task Cohesion'],
        scores: [80, 90]
      },
      {
        questions: ['Collective Efficacy', 'Task Cohesion'],
        scores: [70, 80]
      },
    ];

    const dimensions = calculateDimensionAverages(players);

    expect(dimensions).toHaveLength(2);
    expect(dimensions[0].name).toBe('Collective Efficacy');
    expect(dimensions[0].average).toBe(75);
    expect(dimensions[1].name).toBe('Task Cohesion');
    expect(dimensions[1].average).toBe(85);
  });

  it('should handle empty player array', () => {
    const dimensions = calculateDimensionAverages([]);
    expect(dimensions).toEqual([]);
  });

  it('should filter out NaN scores', () => {
    const players = [
      {
        questions: ['Collective Efficacy'],
        scores: [80]
      },
      {
        questions: ['Collective Efficacy'],
        scores: [NaN]
      },
    ];

    const dimensions = calculateDimensionAverages(players);
    expect(dimensions[0].average).toBe(80);
  });
});
