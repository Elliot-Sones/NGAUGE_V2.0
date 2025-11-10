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
import { getChemistryData } from '../services/dataService';
import { calculateTeamAverage } from '../utils/calculations';

const MAX_HISTORY_LENGTH = 10; // Keep last 10 data points

export function useRealtimeData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]); // Track historical scores
  const intervalRef = useRef(null);

  // Store previous data for trend calculation
  const previousDataRef = useRef({});

  /**
   * Fetch data from the service
   */
  const fetchData = async () => {
    try {
      setError(null);
      const newData = await getChemistryData();

      // Store previous scores for trend calculation
      data.forEach(player => {
        if (player.id && player.scores) {
          const avgScore = player.scores.reduce((sum, s) => sum + s, 0) / player.scores.length;
          previousDataRef.current[player.id] = avgScore;
        }
      });

      // Calculate team average and add to history
      if (newData.length > 0) {
        const teamAvg = calculateTeamAverage(newData);
        const timestamp = new Date();

        setScoreHistory(prevHistory => {
          const newHistory = [
            ...prevHistory,
            { score: teamAvg, timestamp }
          ];

          // Keep only the last MAX_HISTORY_LENGTH items
          return newHistory.slice(-MAX_HISTORY_LENGTH);
        });
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
   * Manual data loading only - no automatic polling
   */
  useEffect(() => {
    // No automatic fetch on mount - user must click refresh button
    setLoading(false);

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
    scoreHistory
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
