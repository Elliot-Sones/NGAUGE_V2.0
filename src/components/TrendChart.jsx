/**
 * TrendChart Component
 *
 * Displays a simple line chart showing historical team chemistry scores
 * Uses pure SVG for lightweight rendering
 */

import React from 'react';
import { getScoreColor } from '../utils/calculations';

const TrendChart = ({ scoreHistory = [], currentScore = 0 }) => {
  // Chart dimensions
  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // If no history, show placeholder
  if (scoreHistory.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-gray-200" style={{ width, height }}>
        <p className="text-sm text-gray-500 font-medium">No trend data yet</p>
      </div>
    );
  }

  // Scale calculations
  const minScore = 0;
  const maxScore = 100;
  const scoreRange = maxScore - minScore;

  // Calculate x and y positions for each point
  const points = scoreHistory.map((item, index) => {
    const x = padding.left + (index / Math.max(scoreHistory.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((item.score - minScore) / scoreRange) * chartHeight;
    return { x, y, score: item.score, timestamp: item.timestamp };
  });

  // Create SVG path for the line
  const linePath = points.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${point.x} ${point.y}`;
  }).join(' ');

  // Get color based on current score
  const lineColor = getScoreColor(currentScore);

  // Format timestamp for tooltip
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
        Score Trend
      </h3>
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <g className="grid-lines">
          {[0, 25, 50, 75, 100].map(value => {
            const y = padding.top + chartHeight - ((value - minScore) / scoreRange) * chartHeight;
            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-400"
                  style={{ fontSize: '10px' }}
                >
                  {value}
                </text>
              </g>
            );
          })}
        </g>

        {/* Line path */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke={lineColor}
              strokeWidth="2"
            />
            {/* Tooltip on hover */}
            <title>
              {point.score.toFixed(1)} at {formatTime(point.timestamp)}
            </title>
          </g>
        ))}

        {/* X-axis labels (show first and last timestamp) */}
        {scoreHistory.length > 1 && (
          <g className="x-axis-labels">
            <text
              x={padding.left}
              y={height - 8}
              textAnchor="start"
              className="text-xs fill-gray-500"
              style={{ fontSize: '10px' }}
            >
              {formatTime(scoreHistory[0].timestamp)}
            </text>
            <text
              x={width - padding.right}
              y={height - 8}
              textAnchor="end"
              className="text-xs fill-gray-500"
              style={{ fontSize: '10px' }}
            >
              {formatTime(scoreHistory[scoreHistory.length - 1].timestamp)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default TrendChart;
