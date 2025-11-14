/**
 * useRealtimeData Hook
 *
 * Custom React hook for real-time data updates with polling
 * Automatically fetches data at regular intervals
 *
 * TO MODIFY UPDATE MECHANISM:
 * - Change POLLING_INTERVAL in config/constants.js
 * - Or replace polling with WebSocket/Server-Sent Events
 */

import { useState, useEffect, useRef } from 'react';
import { getChemistryData, fetchBaselineData } from '../services/dataService';
import { calculateTeamAverage, calculateDimensionAverages } from '../utils/calculations';

const MAX_HISTORY_LENGTH = 10; // Keep last 10 data points

export function useRealtimeData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]); // Track historical team scores
  const [dimensionHistory, setDimensionHistory] = useState([]); // Track historical dimension scores
  const [baselineData, setBaselineData] = useState(null); // Baseline scores from database
  const [baselineLoading, setBaselineLoading] = useState(true);
  const intervalRef = useRef(null);

  // Store previous data for trend calculation
  const previousDataRef = useRef({});

  /**
   * Fetch baseline data from database
   */
  const loadBaselineData = async () => {
    try {
      setBaselineLoading(true);
      const baseline = await fetchBaselineData();
      setBaselineData(baseline); // Will be null if no baseline exists
      console.log('Baseline loaded:', baseline ? 'Data found' : 'No baseline data');
    } catch (err) {
      console.error('Error loading baseline data:', err);
      // Set to null on error - missing baseline is not fatal
      setBaselineData(null);
    } finally {
      setBaselineLoading(false);
    }
  };

  /**
   * Fetch data from the service
   */
  const fetchData = async () => {
    try {
      setError(null);

      // Fetch weekly data and baseline data in parallel
      // Baseline is loaded separately and won't block weekly data
      const [newData] = await Promise.all([
        getChemistryData(),
        loadBaselineData().catch(err => {
          // Baseline errors don't block weekly data loading
          console.warn('Baseline loading failed (non-fatal):', err);
          return null;
        })
      ]);

      // Store previous scores for trend calculation
      data.forEach(player => {
        if (player.id && player.scores) {
          const avgScore = player.scores.reduce((sum, s) => sum + s, 0) / player.scores.length;
          previousDataRef.current[player.id] = avgScore;
        }
      });

      // Calculate team average and dimension averages, add to history
      // This happens regardless of baseline status
      if (newData.length > 0) {
        const teamAvg = calculateTeamAverage(newData);
        const dimensionAvgs = calculateDimensionAverages(newData);
        const timestamp = new Date();

        // Update team score history
        setScoreHistory(prevHistory => {
          const newHistory = [
            ...prevHistory,
            { score: teamAvg, timestamp }
          ];

          // Keep only the last MAX_HISTORY_LENGTH items
          const trimmedHistory = newHistory.slice(-MAX_HISTORY_LENGTH);
          console.log(`Score history updated: ${trimmedHistory.length} entries, latest score: ${teamAvg.toFixed(1)}`);
          return trimmedHistory;
        });

        // Update dimension history
        setDimensionHistory(prevHistory => {
          const newHistory = [
            ...prevHistory,
            { dimensions: dimensionAvgs, timestamp }
          ];

          // Keep only the last MAX_HISTORY_LENGTH items
          return newHistory.slice(-MAX_HISTORY_LENGTH);
        });
      } else {
        console.warn('No weekly data found - scoreHistory not updated');
      }

      setData(newData);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
      setLoading(false);
    }
  };

  /**
   * Get previous score for a player (for trend calculation)
   */
  const getPreviousScore = (playerId) => {
    return previousDataRef.current[playerId] || null;
  };

  /**
   * Manual refresh function
   */
  const refresh = async () => {
    setLoading(true);
    await fetchData();
  };

  /**
   * Automatic data loading on mount
   */
  useEffect(() => {
    // Automatically fetch data when component mounts
    fetchData();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    getPreviousScore,
    scoreHistory,
    dimensionHistory,    // Historical dimension scores for trend calculation
    baselineData,        // Baseline scores object (null if no baseline)
    baselineLoading,     // Loading state for baseline
    hasBaseline: baselineData !== null  // Convenient boolean flag
  };
}

/**
 * FUTURE ENHANCEMENTS:
 *
 * 1. WebSocket Support:
 *    Replace polling with WebSocket connection for true real-time updates
 *
 * 2. Optimistic Updates:
 *    Update UI immediately before server confirmation
 *
 * 3. Retry Logic:
 *    Automatic retry with exponential backoff on errors
 *
 * 4. Data Caching:
 *    Cache data in localStorage to reduce API calls
 *
 * 5. Change Detection:
 *    Only update state if data actually changed
 */
