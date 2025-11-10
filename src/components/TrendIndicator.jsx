/**
 * TrendIndicator Component
 *
 * Displays trend direction with animated arrow and color
 * Shows whether chemistry score is improving, declining, or stable
 */

import React from 'react';

const TrendIndicator = ({ trend }) => {
  if (!trend || trend.direction === 'stable') {
    return (
      <div className="flex items-center text-gray-400 text-sm">
        <span className="mr-1">—</span>
        <span>No change</span>
      </div>
    );
  }

  const isUp = trend.direction === 'up';
  const arrowIcon = isUp ? '↑' : '↓';
  const label = isUp ? 'Improving' : 'Declining';

  return (
    <div
      className="flex items-center gap-1 text-sm font-medium transition-all duration-300"
      style={{ color: trend.color }}
    >
      <span
        className="text-2xl font-bold animate-pulse-slow"
        style={{ color: trend.color }}
      >
        {arrowIcon}
      </span>
      <div className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-xs opacity-75">
          {isUp ? '+' : ''}{trend.change.toFixed(1)} pts
        </span>
      </div>
    </div>
  );
};

export default TrendIndicator;
