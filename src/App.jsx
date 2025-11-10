/**
 * Main App Component
 *
 * Entry point for the NGauge Team Chemistry Dashboard
 *
 * PRODUCTION FEATURES:
 * - Error boundary for graceful error handling
 * - Prevents app crashes from propagating to users
 */

import React from 'react';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;
