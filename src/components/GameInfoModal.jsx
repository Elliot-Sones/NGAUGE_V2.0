import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './Dashboard';

function GameInfoModal({ onSubmit, onSkip }) {
  const [formData, setFormData] = useState({
    result: '',
    yourScore: '',
    opponentScore: '',
    practicePerformance: ''
  });
  const [errors, setErrors] = useState({});
  const resultSelectRef = useRef(null);

  // Auto-focus the first select on mount
  useEffect(() => {
    if (resultSelectRef.current) {
      resultSelectRef.current.focus();
    }
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.result) {
      newErrors.result = 'Please select a game result';
    }

    if (!formData.yourScore || formData.yourScore === '') {
      newErrors.yourScore = 'Please enter your team\'s score';
    } else if (isNaN(formData.yourScore) || formData.yourScore < 0) {
      newErrors.yourScore = 'Score must be a positive number';
    }

    if (!formData.opponentScore || formData.opponentScore === '') {
      newErrors.opponentScore = 'Please enter opponent\'s score';
    } else if (isNaN(formData.opponentScore) || formData.opponentScore < 0) {
      newErrors.opponentScore = 'Score must be a positive number';
    }

    if (!formData.practicePerformance || formData.practicePerformance === '') {
      newErrors.practicePerformance = 'Please rate practice performance';
    } else {
      const performance = parseInt(formData.practicePerformance);
      if (isNaN(performance) || performance < 1 || performance > 10) {
        newErrors.practicePerformance = 'Rating must be between 1 and 10';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const gameData = {
        result: formData.result,
        yourScore: parseInt(formData.yourScore),
        opponentScore: parseInt(formData.opponentScore),
        practicePerformance: parseInt(formData.practicePerformance),
        skipped: false
      };
      console.log('🎮 GameInfoModal - Submitting game data:', gameData);
      onSubmit(gameData);
    }
  };

  const handleSkip = () => {
    onSkip({
      result: null,
      yourScore: null,
      opponentScore: null,
      practicePerformance: null,
      skipped: true
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Background Dashboard (blurred) */}
      <div className="absolute inset-0">
        <Dashboard />
      </div>

      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[20px] bg-black/40"></div>

      {/* Modal content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-black/10 backdrop-blur-md rounded-2xl p-8 sm:p-10 shadow-2xl border border-white/10">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Game Information
              </h2>
              <p className="text-gray-300 text-sm">
                Help us provide better insights by sharing game details
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Game Result */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Game Result
                </label>
                <select
                  ref={resultSelectRef}
                  value={formData.result}
                  onChange={(e) => handleChange('result', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.result ? 'border-red-500' : 'border-white/10'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                >
                  <option value="" className="bg-gray-800">Select result...</option>
                  <option value="Win" className="bg-gray-800">Win</option>
                  <option value="Lose" className="bg-gray-800">Lose</option>
                  <option value="Tie" className="bg-gray-800">Tie</option>
                </select>
                {errors.result && (
                  <p className="mt-1 text-sm text-red-400">{errors.result}</p>
                )}
              </div>

              {/* Score Section */}
              <div className="grid grid-cols-2 gap-4">
                {/* Your Team Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Your Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.yourScore}
                    onChange={(e) => handleChange('yourScore', e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={`w-full px-4 py-3 bg-white/5 border ${
                      errors.yourScore ? 'border-red-500' : 'border-white/10'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                    placeholder="0"
                  />
                  {errors.yourScore && (
                    <p className="mt-1 text-sm text-red-400">{errors.yourScore}</p>
                  )}
                </div>

                {/* Opponent Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Opponent
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.opponentScore}
                    onChange={(e) => handleChange('opponentScore', e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={`w-full px-4 py-3 bg-white/5 border ${
                      errors.opponentScore ? 'border-red-500' : 'border-white/10'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                    placeholder="0"
                  />
                  {errors.opponentScore && (
                    <p className="mt-1 text-sm text-red-400">{errors.opponentScore}</p>
                  )}
                </div>
              </div>

              {/* Practice Performance */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Practice Performance (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.practicePerformance}
                  onChange={(e) => handleChange('practicePerformance', e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.practicePerformance ? 'border-red-500' : 'border-white/10'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="1-10"
                />
                {errors.practicePerformance && (
                  <p className="mt-1 text-sm text-red-400">{errors.practicePerformance}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Rate your team's practice performance this week
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg text-white font-medium hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-lg"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameInfoModal;
