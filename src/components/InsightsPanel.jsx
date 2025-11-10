/**
 * InsightsPanel Component
 *
 * Displays reasons, findings, and things to look out for
 *
 * PLACEHOLDER STRUCTURE - Ready for your custom logic
 *
 * TO ADD YOUR INSIGHTS:
 * 1. Update generateInsights() in utils/calculations.js
 * 2. Return array of insight objects with your analysis
 * 3. This component will automatically display them
 */

import React from 'react';
import PropTypes from 'prop-types';

const InsightsPanel = ({ insights = [] }) => {
  // Placeholder insights for demonstration
  const defaultInsights = [
    {
      type: 'info',
      category: 'AI-Powered Insights',
      message: 'Use the Generate Insights button in the Findings section to analyze team responses with AI',
      recommendation: 'The AI will analyze open-ended Question 1 and Question 7 responses from your team to provide actionable insights'
    }
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  // Color mapping for different insight types
  const getTypeColor = (type) => {
    switch (type) {
      case 'positive':
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'placeholder':
        return 'bg-gray-50 border-gray-200 text-gray-600';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
          Things to look out for
        </h2>
      </div>

      <div className="space-y-6">
        {displayInsights.map((insight, index) => (
          <div
            key={index}
            className={`p-7 rounded-lg border-l-4 transition-all duration-300 hover:shadow-md ${getTypeColor(insight.type)}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="font-bold text-xl mb-3 uppercase tracking-wide">
                  {insight.category}
                </div>
                <p className="text-lg leading-relaxed mb-4">
                  {insight.message}
                </p>
                {insight.recommendation && (
                  <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                    <p className="text-base font-semibold opacity-90">
                      → Recommendation: {insight.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

InsightsPanel.propTypes = {
  insights: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['positive', 'success', 'warning', 'critical', 'info', 'placeholder']).isRequired,
      category: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
      recommendation: PropTypes.string,
    })
  ),
};

InsightsPanel.defaultProps = {
  insights: [],
};

export default InsightsPanel;
