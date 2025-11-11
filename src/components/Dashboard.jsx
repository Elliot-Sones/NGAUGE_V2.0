/**
 * Team Chemistry Dashboard - CONFIDENTIAL
 *
 * Displays team-level analytics ONLY (no individual player data)
 * Focus on aggregate metrics with 95% confidence intervals
 *
 */

import React from 'react';
import { useRealtimeData } from '../hooks/useRealtimeData';
import {
  calculateAverageScore,
  calculateTeamAverage,
  calculateTrend,
  getScoreColor,
  calculateDimensionAverages
} from '../utils/calculations';
import { generateScoreExplanation, analyzeTeamInsights } from '../services/geminiService';
import { BASELINE_SCORES } from '../config/constants';
import InsightsPanel from './InsightsPanel';
import TrendChart from './TrendChart';

const Dashboard = () => {
  const { data, loading, error, lastUpdated, refresh, scoreHistory } = useRealtimeData();

  // Calculate team-level metrics
  const teamAverage = calculateTeamAverage(data);
  const playerCount = data.length;

  const previousTeamAverage =
    scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 2].score : null;

  const teamColor = getScoreColor(teamAverage);

  const dimensionAverages = React.useMemo(() => calculateDimensionAverages(data), [data]);
  const previousDimensionAveragesRef = React.useRef([]);

  const dimensionsWithTrends = React.useMemo(() => {
    const previousDimensions = previousDimensionAveragesRef.current;

    return dimensionAverages.map((dimension, index) => {
      const previousAverage = previousDimensions[index]?.average ?? null;
      return {
        ...dimension,
        trend: calculateTrend(dimension.average, previousAverage)
      };
    });
  }, [dimensionAverages]);

  React.useEffect(() => {
    previousDimensionAveragesRef.current = dimensionAverages;
  }, [dimensionAverages]);

  // State for AI-generated content
  const [insights, setInsights] = React.useState([]);
  const [scoreExplanation, setScoreExplanation] = React.useState(null);
  const [insightsLoading, setInsightsLoading] = React.useState(false);
  const [explanationLoading, setExplanationLoading] = React.useState(false);

  // Calculate baseline average for score explanation
  const baselineAverage = React.useMemo(() => {
    const baselineValues = Object.values(BASELINE_SCORES);
    return baselineValues.reduce((sum, val) => sum + val, 0) / baselineValues.length;
  }, []);

  // Calculate overall average from score history
  const overallAverage = React.useMemo(() => {
    if (scoreHistory.length === 0) return teamAverage;
    const sum = scoreHistory.reduce((acc, entry) => acc + entry.score, 0);
    return sum / scoreHistory.length;
  }, [scoreHistory, teamAverage]);

  // Manual refresh function for score explanation (Call 1)
  const refreshScoreExplanation = async () => {
    if (data.length > 0) {
      setExplanationLoading(true);
      try {
        const difference = teamAverage - baselineAverage;
        const explanation = await generateScoreExplanation(
          teamAverage,
          baselineAverage,
          difference,
          overallAverage
        );
        setScoreExplanation(explanation);
      } catch (error) {
        console.error('Failed to generate score explanation:', error);
        setScoreExplanation('Unable to generate explanation. Please try again.');
      } finally {
        setExplanationLoading(false);
      }
    }
  };

  // Manual refresh function for AI insights (Call 2)
  const refreshInsights = async () => {
    if (data.length > 0) {
      setInsightsLoading(true);
      try {
        const aiInsights = await analyzeTeamInsights(data, teamAverage);
        setInsights(aiInsights);
      } catch (error) {
        console.error('Failed to generate insights:', error);
      } finally {
        setInsightsLoading(false);
      }
    }
  };

  /**
   * Empty State - No Data Loaded
   */
  if (data.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">No Data Loaded</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Click the refresh button to load team chemistry data</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md min-h-[44px]"
          >
            Load Data
          </button>
        </div>
      </div>
    );
  }

  /**
   * Loading State
   */
  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-base sm:text-xl text-gray-700 font-semibold">Loading team analytics...</p>
        </div>
      </div>
    );
  }

  /**
   * Error State
   */
  if (error && data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full">
          <div className="text-red-600 text-4xl sm:text-5xl mb-3 sm:mb-4">⚠</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold min-h-[44px]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Helper function to get tier info with matching score colors
  const getTierInfo = (score) => {
    if (score >= 80) return { label: 'ELITE', range: '80-100', color: '#10b981' }; // Bright Green
    if (score >= 70) return { label: 'ABOVE AVERAGE', range: '70-79', color: '#059669' }; // Dark Green
    if (score >= 60) return { label: 'AVERAGE', range: '60-69', color: '#f59e0b' }; // Orange
    return { label: 'BELOW AVERAGE', range: '0-59', color: '#ef4444' }; // Red
  };

  const currentTier = getTierInfo(teamAverage);
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Header */}
      <header className="py-4 sm:py-6" style={{ backgroundColor: 'rgb(50, 52, 52)' }}>
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Top row: Logo, Title, and Refresh button */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <img src="/Ntangible.png" alt="Ntangible Logo" className="h-10 w-10 sm:h-12 sm:w-12 brightness-0 invert flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">TEAM CHEMISTRY REPORT</h1>
              </div>
            </div>

            {/* Date and Refresh button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              <div className="text-left sm:text-right">
                <div className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider">Report Date</div>
                <div className="text-base sm:text-lg font-semibold text-white">{currentDate}</div>
              </div>
              <button
                onClick={refresh}
                disabled={loading}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all shadow-md min-h-[44px] ${
                  loading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-800 hover:bg-gray-100 active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Loading...
                  </>
                ) : (
                  <>
                    <span className="mr-2">⟳</span>
                    Refresh Data
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Report Details */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-8 text-xs sm:text-sm">
            <div>
              <span className="text-gray-400 uppercase tracking-wider">Number of Players: </span>
              <span className="font-semibold text-white">{playerCount}</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wider">Last Updated: </span>
              <span className="font-semibold text-white">
                {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-12">

        {/* Hero Section - Score and Trend Chart */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr,auto] gap-6 lg:gap-8 mb-12 pb-8 border-b-2 border-gray-200">
          {/* Main Score */}
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
              NGAUGE TEAM CHEMISTRY SCORE
            </h2>
            <div className="flex items-baseline gap-3 sm:gap-6 mb-4 sm:mb-6">
              <div className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight" style={{ color: teamColor }}>
                {teamAverage.toFixed(1)}
              </div>
              {(() => {
                const trend = previousTeamAverage !== null
                  ? calculateTrend(teamAverage, previousTeamAverage)
                  : { direction: 'stable', color: '#6b7280' };

                return (
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold" style={{ color: trend.color }}>
                    {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                  </div>
                );
              })()}
            </div>

            {/* Current Tier Badge */}
            <div
              className="inline-block px-4 py-2 sm:px-6 sm:py-3 rounded-lg border-2 bg-white"
              style={{ borderColor: currentTier.color }}
            >
              <div className="text-base sm:text-lg font-bold tracking-wide text-gray-900">{currentTier.label}</div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="flex items-center justify-center lg:justify-start">
            <TrendChart scoreHistory={scoreHistory} currentScore={teamAverage} />
          </div>
        </div>

        {/* What do NGauge scores mean - Two Column Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-[2fr,1fr] gap-6 lg:gap-12 mb-12 pb-12 border-b-2 border-gray-200">
          {/* Left: Explanation */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 uppercase tracking-tight">
              What do NGauge scores mean?
            </h2>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              NGauge scores accurately measure team chemistry on a 100-point scale, reflecting how <strong>connected, clear, and ready</strong> the team feels. These scores use your teams baseline chemistry score to denoise
              the data and show you the most <strong>meaningful changes in team chemistry.</strong>
            </p>
          </div>

          {/* Right: Score Classification Bars */}
          <div className="flex flex-col justify-center space-y-2 sm:space-y-3">
            <div className="rounded-lg px-3 py-2 border-2 bg-white" style={{ borderColor: '#10b981' }}>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-bold tracking-wide text-gray-900">ELITE</span>
                <span className="font-semibold text-gray-700">80+</span>
              </div>
            </div>

            <div className="rounded-lg px-3 py-2 border-2 bg-white" style={{ borderColor: '#059669' }}>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-bold tracking-wide text-gray-900">ABOVE AVERAGE</span>
                <span className="font-semibold text-gray-700">70-79</span>
              </div>
            </div>

            <div className="rounded-lg px-3 py-2 border-2 bg-white" style={{ borderColor: '#f59e0b' }}>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-bold tracking-wide text-gray-900">AVERAGE</span>
                <span className="font-semibold text-gray-700">60-69</span>
              </div>
            </div>

            <div className="rounded-lg px-3 py-2 border-2 bg-white" style={{ borderColor: '#ef4444' }}>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-bold tracking-wide text-gray-900">BELOW AVERAGE</span>
                <span className="font-semibold text-gray-700">0-59</span>
              </div>
            </div>
          </div>
        </div>

        {/* Findings */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 uppercase tracking-tight">FINDINGS</h2>
            <button
              onClick={refreshScoreExplanation}
              disabled={explanationLoading}
              className={`px-4 sm:px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md min-h-[44px] text-sm sm:text-base ${
                explanationLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 active:scale-95 hover:shadow-lg'
              }`}
            >
              {explanationLoading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Analyzing...
                </>
              ) : (
                'Explain Scores'
              )}
            </button>
          </div>

          {/* Column Headers - Hidden on mobile, shown on md+ */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <div className="grid grid-cols-[1fr,auto,auto] gap-3 sm:gap-6 px-3 items-center">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Dimension</div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right" style={{ minWidth: '80px' }}>Weekly</div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right" style={{ minWidth: '60px' }}>Baseline</div>
            </div>
            <div className="grid grid-cols-[1fr,auto,auto] gap-3 sm:gap-6 px-3 items-center">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Dimension</div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right" style={{ minWidth: '80px' }}>Weekly</div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right" style={{ minWidth: '60px' }}>Baseline</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dimensionsWithTrends.map((dimension, index) => {
              const dimColor = getScoreColor(dimension.average);
              const baselineScore = BASELINE_SCORES[dimension.name] || 0;
              const weeklyScore = dimension.average;
              const difference = weeklyScore - baselineScore;

              // Determine difference display
              const diffDisplay = Math.abs(difference) < 0.5
                ? '--'
                : `${difference > 0 ? '+' : ''}${difference.toFixed(1)}`;
              const diffColor = Math.abs(difference) < 0.5
                ? '#6b7280'
                : difference > 0 ? '#10b981' : '#ef4444';
              const diffArrow = Math.abs(difference) < 0.5
                ? ''
                : difference > 0 ? '↑' : '↓';

              return (
                <div
                  key={index}
                  className="bg-white border-l-4 rounded px-3 py-2.5 h-full"
                  style={{ borderLeftColor: dimColor }}
                >
                  <div className="grid grid-cols-[1fr,auto,auto] gap-3 sm:gap-6 items-center">
                    {/* Dimension Name */}
                    <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                      {dimension.name}
                    </div>

                    {/* Weekly Score + Difference */}
                    <div className="flex items-baseline gap-1 sm:gap-2 justify-end" style={{ minWidth: '70px' }}>
                      <span className="text-base sm:text-lg font-bold" style={{ color: dimColor }}>
                        {weeklyScore.toFixed(1)}
                      </span>
                      <span
                        className="text-xs sm:text-sm font-semibold"
                        style={{ color: diffColor }}
                      >
                        {diffDisplay}{diffArrow}
                      </span>
                    </div>

                    {/* Baseline Score */}
                    <div className="text-right" style={{ minWidth: '50px' }}>
                      <span className="text-base sm:text-lg font-bold text-gray-500">
                        {baselineScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* LLM Score Explanation Section */}
          <div className="mt-6 bg-gray-50 border-2 border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 uppercase tracking-tight">
              Score Analysis
            </h3>
            {scoreExplanation ? (
              <div className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                {scoreExplanation}
              </div>
            ) : (
              <p className="text-sm sm:text-base text-gray-500 italic">
                Click "Explain Scores" to generate an AI-powered analysis of the variance between baseline and weekly scores,
                and how this trend could impact your overall team chemistry average.
              </p>
            )}
          </div>
        </div>

        {/* AI INSIGHTS PANEL */}
        <div className="mb-12">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 uppercase tracking-tight">AI-POWERED INSIGHTS</h2>
            <button
              onClick={refreshInsights}
              disabled={insightsLoading}
              className={`px-4 sm:px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md min-h-[44px] text-sm sm:text-base ${
                insightsLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 hover:shadow-lg'
              }`}
            >
              {insightsLoading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Analyzing...
                </>
              ) : (
                'Generate Insights'
              )}
            </button>
          </div>
          <InsightsPanel insights={insights} />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t-2 border-gray-200 py-4 sm:py-6 bg-gray-50">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 text-center">
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            NGauge Team Chemistry Report - Confidential
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Generated by NTangible Analytics Platform
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
