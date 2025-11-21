/**
 * Application Configuration Constants
 *
 * MODULAR DESIGN: All thresholds, colors, and configuration in one place
 * TO MODIFY: Simply update values here to change behavior across the app
 */

// Google Sheets Configuration
export const GOOGLE_SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '13WmxejOq6Lm8xVffSzaXsbFnLkJ-A9a_KREEG0n73-I';

// Real-time update configuration
export const POLLING_INTERVAL = parseInt(import.meta.env.VITE_POLLING_INTERVAL) || 5000; // 5 seconds

// Score thresholds (0-100 scale)
// TO MODIFY: Adjust these values to change when colors change
export const THRESHOLDS = {
  HIGH: parseInt(import.meta.env.VITE_THRESHOLD_HIGH) || 80,    // Green if score >= 80
  MEDIUM: parseInt(import.meta.env.VITE_THRESHOLD_MEDIUM) || 60 // Orange if score >= 60, Red if < 60
};

// Color scheme for chemistry scores
// TO MODIFY: Change colors to match your brand or preferences
export const COLORS = {
  HIGH: '#10b981',     // Green - Good chemistry
  MEDIUM: '#f59e0b',   // Orange - Moderate chemistry
  LOW: '#ef4444',      // Red - Poor chemistry
  NEUTRAL: '#6b7280'   // Gray - No trend or neutral
};

// Trend configuration
// TO MODIFY: Adjust sensitivity of trend detection
export const TREND_CONFIG = {
  THRESHOLD: 0.5, // Minimum point change to show trend (±0.5 points)
  LOOKBACK_PERIODS: 2 // How many previous data points to compare
};

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 300, // milliseconds
  DECIMAL_PLACES: 1,       // Number of decimal places for scores
  LOADING_DELAY: 500       // Minimum loading state duration
};

// Dashboard layout
export const LAYOUT = {
  MAX_PLAYERS_PER_ROW: 3,
  CARD_MIN_WIDTH: '300px'
};
