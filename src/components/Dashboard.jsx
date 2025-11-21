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
import { generateScoreExplanation, generateThingsToLookOutFor } from '../services/geminiService';
import { fetchStoredInsights, saveInsights, fetchLatestGameInfo } from '../services/dataService';
import TrendChart from './TrendChart';

const Dashboard = ({ gameInfoData, onRefresh, shouldGenerateAnalysis, onAnalysisComplete, onAddGame, onRequestGameInfo }) => {
  const { data, loading, error, lastUpdated, refresh, scoreHistory, dimensionHistory } = useRealtimeData();

  // Calculate team-level metrics
  const teamAverage = calculateTeamAverage(data);
  const playerCount = data.length;

  const previousTeamAverage =
    scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 2].score : null;

  const teamColor = getScoreColor(teamAverage);

  const dimensionAverages = React.useMemo(() => calculateDimensionAverages(data), [data]);

  const dimensionsWithTrends = React.useMemo(() => {
    // Get previous dimension data from history (if available)
    const previousDimensions = dimensionHistory.length >= 2
      ? dimensionHistory[dimensionHistory.length - 2].dimensions
      : null;

    return dimensionAverages.map((dimension, index) => {
      const previousAverage = previousDimensions?.[index]?.average ?? null;
      const currentAverage = dimension.average;

      // Calculate numeric difference from previous refresh
      const numericChange = previousAverage !== null
        ? currentAverage - previousAverage
        : null;

      return {
        ...dimension,
        trend: calculateTrend(currentAverage, previousAverage),
        previousAverage,
        numericChange
      };
    });
  }, [dimensionAverages, dimensionHistory]);

  // State for AI-generated content
  const [scoreExplanation, setScoreExplanation] = React.useState(null);
  const [explanationLoading, setExplanationLoading] = React.useState(false);
  const [thingsToLookOutFor, setThingsToLookOutFor] = React.useState(null);
  const [thingsLoading, setThingsLoading] = React.useState(false);


  // Calculate overall average from score history
  const overallAverage = React.useMemo(() => {
    if (scoreHistory.length === 0) return teamAverage;
    const sum = scoreHistory.reduce((acc, entry) => acc + entry.score, 0);
    return sum / scoreHistory.length;
  }, [scoreHistory, teamAverage]);

  // Manual refresh function for both analyses
  // Fetches latest game info from sheet and generates new analysis with that same game data
  const refreshScoreExplanation = async () => {
    console.log('📊 Dashboard - refreshScoreExplanation called - fetching latest game info from sheet');

    if (data.length > 0) {
      setExplanationLoading(true);
      setThingsLoading(true);
      try {
        // Fetch the most recent game info from the sheet
        const latestGameInfo = await fetchLatestGameInfo();

        if (!latestGameInfo) {
          console.log('⚠️ No game info found in sheet - cannot regenerate analysis');
          setScoreExplanation('No historical game data found. Please refresh the page to add game information.');
          setExplanationLoading(false);
          setThingsLoading(false);
          return;
        }

        console.log('📋 Using game info from most recent row:', latestGameInfo);

        console.log('🤖 Generating BOTH analyses with same game info:', latestGameInfo);
        // Generate both analyses in parallel
        const [explanation, thingsAnalysis] = await Promise.all([
          generateScoreExplanation(teamAverage, overallAverage, latestGameInfo),
          generateThingsToLookOutFor(data)
        ]);

        setScoreExplanation(explanation);
        setThingsToLookOutFor(thingsAnalysis);

        // Save to Google Sheets with SAME game info - APPENDS new row with new timestamp
        console.log('💾 Appending new analysis row to Google Sheets with BOTH analyses and same gameInfo:', latestGameInfo);
        await saveInsights(explanation, null, latestGameInfo, thingsAnalysis);
        console.log('✅ New analysis row with BOTH analyses appended successfully');
      } catch (error) {
        console.error('❌ Failed to generate analyses:', error);
        setScoreExplanation('Unable to generate explanation. Please try again.');
      } finally {
        setExplanationLoading(false);
        setThingsLoading(false);
      }
    }
  };

  // Auto-generate score explanation on first load if it doesn't exist
  const hasCheckedForInsights = React.useRef(false);

  React.useEffect(() => {
    console.log('🔄 Dashboard useEffect - Conditions:', {
      loading,
      dataLength: data.length,
      hasChecked: hasCheckedForInsights.current,
      shouldGenerateAnalysis
    });

    // IMPORTANT: Skip this effect if shouldGenerateAnalysis is true
    // The second useEffect will handle generation in that case
    if (shouldGenerateAnalysis) {
      console.log('⏭️ Skipping first useEffect because shouldGenerateAnalysis=true');
      return;
    }

    // Only run after data is loaded and we haven't checked yet
    if (!loading && data.length > 0 && !hasCheckedForInsights.current) {
      hasCheckedForInsights.current = true;
      console.log('✅ Initial load conditions met, checking for existing insights...');

      // ALWAYS pull from latest insights first
      const loadInsights = async () => {
        try {
          const stored = await fetchStoredInsights();

          // Check if insights are COMPLETE (both fields present)
          if (stored.isComplete) {
            // Insights are complete - load them
            console.log('📖 Loading complete insights from sheet');
            setScoreExplanation(stored.scoreExplanation);
            setThingsToLookOutFor(stored.thingsToLookOutFor);
          } else {
            // Insights are incomplete or missing - show GameInfoModal
            console.log('⚠️ Insights incomplete or missing - showing GameInfoModal');
            console.log('Stored insights status:', {
              hasInsights: stored.hasInsights,
              isComplete: stored.isComplete,
              hasScoreExplanation: !!stored.scoreExplanation,
              hasThingsToLookOutFor: !!stored.thingsToLookOutFor
            });

            // Trigger GameInfoModal to show
            if (onRequestGameInfo) {
              onRequestGameInfo();
            }
          }
        } catch (error) {
          console.error('❌ Error loading insights:', error);
          hasCheckedForInsights.current = false; // Allow retry
        }
      };

      loadInsights();
    }
  }, [loading, data.length, shouldGenerateAnalysis, onRequestGameInfo]);

  // Auto-generate analysis when trigger flag is set (from game info submission)
  React.useEffect(() => {
    console.log('🔄 Dashboard - shouldGenerateAnalysis effect:', {
      shouldGenerateAnalysis,
      hasGameInfo: !!gameInfoData,
      dataLength: data.length,
      loading
    });

    if (shouldGenerateAnalysis && gameInfoData && data.length > 0 && !loading) {
      console.log('✅ Conditions met - generating new analysis');

      const generateNewAnalysis = async () => {
        setExplanationLoading(true);
        setThingsLoading(true);
        try {
          console.log('🤖 Generating NEW analysis with gameInfo:', gameInfoData);

          // Generate both analyses in parallel
          const [explanation, thingsAnalysis] = await Promise.all([
            generateScoreExplanation(
              teamAverage,
              overallAverage,
              gameInfoData
            ),
            generateThingsToLookOutFor(data)
          ]);

          // Update state
          setScoreExplanation(explanation);
          setThingsToLookOutFor(thingsAnalysis);

          // Save to Google Sheets with game info - APPENDS new row
          console.log('💾 Saving new analysis row with gameInfo:', gameInfoData);
          await saveInsights(explanation, null, gameInfoData, thingsAnalysis);

          console.log('✅ New analysis generated and saved successfully');
        } catch (error) {
          console.error('❌ Error generating new analysis:', error);
        } finally {
          setExplanationLoading(false);
          setThingsLoading(false);
          // Reset the trigger flag
          if (onAnalysisComplete) {
            onAnalysisComplete();
          }
        }
      };

      generateNewAnalysis();
    }
  }, [shouldGenerateAnalysis, gameInfoData, data.length, loading, teamAverage, overallAverage, onAnalysisComplete]);

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
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    refresh();
                    if (onRefresh) onRefresh();
                  }}
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
                <button
                  onClick={() => {
                    if (onAddGame) onAddGame();
                  }}
                  disabled={loading}
                  className={`px-4 py-2.5 rounded-lg font-semibold transition-all shadow-md min-h-[44px] ${
                    loading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-white/10 text-white border-2 border-white/20 hover:bg-white/20 active:scale-95'
                  }`}
                >
                  <span className="mr-2">+</span>
                  Add Game
                </button>
              </div>
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
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr,auto,auto] gap-6 lg:gap-8 mb-12 pb-8 border-b-2 border-gray-200">
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

          {/* Submission Status Indicator */}
          {gameInfoData && !gameInfoData.skipped && (
            <div className="flex items-center justify-center lg:justify-start">
              <div className="inline-flex flex-col gap-3 px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-lg shadow-md min-w-[200px]">
                <div className="flex flex-col gap-1 text-left">
                  <div className="text-2xl font-black text-gray-500 uppercase tracking-tight">
                    {gameInfoData.result === 'Win' ? 'WIN' : gameInfoData.result === 'Lose' ? 'LOSE' : gameInfoData.result === 'Tie' ? 'TIE' : 'NO GAME'}
                  </div>
                  {gameInfoData.result !== 'No Game' && gameInfoData.yourScore !== null && gameInfoData.opponentScore !== null && (
                    <div className="text-lg font-bold text-gray-500">
                      {gameInfoData.yourScore} - {gameInfoData.opponentScore}
                    </div>
                  )}
                </div>
                <div className="text-left border-t-2 border-gray-300 pt-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Practice</div>
                  <div className="text-3xl font-black text-gray-500">{gameInfoData.practicePerformance}<span className="text-lg text-gray-500">/10</span></div>
                </div>
              </div>
            </div>
          )}

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
              NGauge scores accurately measure team chemistry on a 100-point scale, reflecting how <strong>connected, clear, and ready</strong> the team feels. These scores show you the most <strong>meaningful changes in team chemistry</strong> over time.
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
        <div className="mb-12 pb-12 border-b-2 border-gray-200">
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
            <div className="grid grid-cols-[1fr,auto] gap-3 sm:gap-6 px-3 items-center">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Dimension</div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right" style={{ minWidth: '80px' }}>Weekly</div>
            </div>
            <div className="grid grid-cols-[1fr,auto] gap-3 sm:gap-6 px-3 items-center">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Dimension</div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider text-right" style={{ minWidth: '80px' }}>Weekly</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dimensionsWithTrends.map((dimension, index) => {
              const dimColor = getScoreColor(dimension.average);
              const weeklyScore = dimension.average;

              // Show weekly trend (comparison to last refresh)
              let diffDisplay, diffColor, diffArrow;

              if (dimension.trend && dimension.numericChange !== null) {
                // Show numeric change and arrow
                const change = dimension.numericChange;
                const absChange = Math.abs(change);

                if (absChange < 0.5) {
                  // Negligible change
                  diffDisplay = '--';
                  diffColor = '#6b7280';
                  diffArrow = '';
                } else {
                  // Significant change - show number + arrow
                  diffDisplay = `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
                  diffColor = dimension.trend.color;
                  diffArrow = dimension.trend.direction === 'up' ? '↑'
                    : dimension.trend.direction === 'down' ? '↓'
                    : '';
                }
              } else {
                // No trend data yet (first load)
                diffDisplay = null;
                diffColor = null;
                diffArrow = null;
              }

              return (
                <div
                  key={index}
                  className="bg-white border-l-4 rounded px-3 py-2.5 h-full"
                  style={{ borderLeftColor: dimColor }}
                >
                  <div className="grid grid-cols-[1fr,auto] gap-3 sm:gap-6 items-center">
                    {/* Dimension Name */}
                    <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                      {dimension.name}
                    </div>

                    {/* Weekly Score + Weekly Trend */}
                    <div className="flex items-baseline gap-1 sm:gap-2 justify-end" style={{ minWidth: '70px' }}>
                      <span className="text-base sm:text-lg font-bold" style={{ color: dimColor }}>
                        {weeklyScore.toFixed(1)}
                      </span>
                      {/* Show weekly trend (comparison to last refresh) */}
                      {diffDisplay !== null && diffArrow !== null && (
                        <span
                          className="text-xs sm:text-sm font-semibold"
                          style={{ color: diffColor }}
                        >
                          {diffDisplay}{diffArrow}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* LLM Score Explanation Section */}
          <div className="mt-6">
            <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-3 uppercase tracking-tight">
              Score Analysis
            </h3>
            {scoreExplanation ? (
              <div className="text-sm sm:text-base text-gray-900 leading-relaxed whitespace-pre-line">
                {scoreExplanation}
              </div>
            ) : (
              <p className="text-sm sm:text-base text-gray-900">
                Click "Explain Scores" to generate an AI-powered analysis of your weekly scores and overall team chemistry trends.
              </p>
            )}
          </div>

          {/* Things to look out for Section */}
          <div className="mt-6">
            <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-3 uppercase tracking-tight">
              Things to look out for
            </h3>

            {/* Loading State */}
            {thingsLoading && (
              <p className="text-sm text-gray-500 italic">Analyzing player responses...</p>
            )}

            {/* Analysis Content */}
            {thingsToLookOutFor && !thingsLoading && (
              <div className="text-sm sm:text-base text-gray-900 leading-relaxed">
                {thingsToLookOutFor.split('\n').map((line, index) => {
                  // Check if line starts with **text** (markdown bold)
                  const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)$/);
                  if (boldMatch) {
                    return (
                      <div key={index} className="mt-1 first:mt-0">
                        <h4 className="font-bold text-sm sm:text-base mb-0.5">{boldMatch[1]}</h4>
                        {boldMatch[2] && <p className="whitespace-pre-line">{boldMatch[2]}</p>}
                      </div>
                    );
                  }
                  // Regular line
                  return line ? <p key={index} className="whitespace-pre-line mb-0.5">{line}</p> : null;
                })}
              </div>
            )}

            {/* Empty State */}
            {!thingsToLookOutFor && !thingsLoading && (
              <p className="text-xs sm:text-sm text-gray-500 italic">
                This analysis auto-generates with the Score Analysis above.
              </p>
            )}
          </div>

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
