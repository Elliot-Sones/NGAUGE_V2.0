/**
 * InsightsPanel Component
 *
 * Displays suggestions for progress based on AI analysis
 */

import React from 'react';
import PropTypes from 'prop-types';

const InsightsPanel = ({ suggestions = [] } = {}) => {
  // Placeholder suggestions for demonstration
  const defaultSuggestions = [
    {
      topic: 'AI-Powered Insights',
      suggestion: 'Use the Generate Insights button in the Things to Look Out For section to analyze team responses with AI. The AI will analyze open-ended Question 1 and Question 9 responses from your team to provide actionable suggestions.'
    }
  ];

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 uppercase tracking-tight">
          Suggestions for progress
        </h2>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {displaySuggestions.map((item, index) => (
          <div
            key={index}
            className="p-4 sm:p-6 lg:p-7 rounded-lg border-2 border-gray-200 bg-white hover:shadow-md transition-all duration-300"
          >
            <div className="font-bold text-base sm:text-lg lg:text-xl mb-2 sm:mb-3 uppercase tracking-wide text-gray-900">
              {item.topic}
            </div>
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-gray-700">
              → {item.suggestion}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
};

InsightsPanel.propTypes = {
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      topic: PropTypes.string.isRequired,
      suggestion: PropTypes.string.isRequired,
    })
  ),
};

export default InsightsPanel;
