/**
 * ScoreCard Component
 *
 * Displays a player's chemistry score with:
 * - Large, color-coded number
 * - Trend indicator
 * - Player name
 * - Score label (Excellent/Good/Fair/etc.)
 */

import React from 'react';
import TrendIndicator from './TrendIndicator';
import { getScoreColor, getScoreLabel } from '../utils/calculations';

const ScoreCard = ({ player, score, trend, previousScore }) => {
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
      {/* Player Name */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800">{player.name}</h3>
        <p className="text-sm text-gray-500">Chemistry Score</p>
      </div>

      {/* Big Score Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div
            className="text-6xl font-bold transition-colors duration-500"
            style={{ color: scoreColor }}
          >
            {score.toFixed(1)}
          </div>
          <div className="mt-2">
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: scoreColor }}
            >
              {scoreLabel}
            </span>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="ml-4">
          <TrendIndicator trend={trend} />
        </div>
      </div>

      {/* Score Breakdown Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${score}%`,
              backgroundColor: scoreColor
            }}
          />
        </div>
      </div>

      {/* Individual Question Scores Preview */}
      {player.scores && player.scores.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Question Scores:</p>
          <div className="flex gap-1">
            {player.scores.slice(0, 5).map((questionScore, idx) => {
              const qColor = getScoreColor(questionScore);
              return (
                <div
                  key={idx}
                  className="flex-1 h-8 rounded flex items-center justify-center text-xs font-semibold text-white transition-colors duration-300"
                  style={{ backgroundColor: qColor }}
                  title={player.questions?.[idx] || `Question ${idx + 1}`}
                >
                  {questionScore}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreCard;
