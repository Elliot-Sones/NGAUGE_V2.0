/**
 * Main App Component
 *
 * Entry point for the NGauge Team Chemistry Dashboard
 *
 * PRODUCTION FEATURES:
 * - Password authentication gate
 * - HTTP-only session cookie management
 * - Error boundary for graceful error handling
 * - Prevents app crashes from propagating to users
 */

import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import PasswordGate from './components/PasswordGate';
import GameInfoModal from './components/GameInfoModal';
import ErrorBoundary from './components/ErrorBoundary';
import { checkAuthStatus } from './services/authService';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, true/false = auth state
  const [isChecking, setIsChecking] = useState(true);
  const [showGameInfoModal, setShowGameInfoModal] = useState(false);
  const [gameInfoData, setGameInfoData] = useState(null);
  const [shouldGenerateAnalysis, setShouldGenerateAnalysis] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    async function verifySession() {
      try {
        const result = await checkAuthStatus();
        setIsAuthenticated(result.authenticated);
      } catch (error) {
        console.error('Failed to check auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    }

    verifySession();
  }, []);

  // Handle game info submission
  const handleGameInfoSubmit = (data) => {
    console.log('📱 App.jsx - Received game info from modal:', data);
    setGameInfoData(data);
    setShowGameInfoModal(false);
    setShouldGenerateAnalysis(true); // Trigger analysis generation
  };

  // Handle game info skip
  const handleGameInfoSkip = (data) => {
    console.log('📱 App.jsx - User skipped game info:', data);
    setGameInfoData(data);
    setShowGameInfoModal(false);
    setShouldGenerateAnalysis(true); // Trigger analysis even for skipped
  };

  // Handle refresh from Dashboard (re-show game info modal)
  const handleRefresh = () => {
    setShowGameInfoModal(true);
  };

  // Handle add game button from Dashboard (re-show game info modal)
  const handleAddGame = () => {
    console.log('📱 App.jsx - Add Game button clicked, showing game info modal');
    setShowGameInfoModal(true);
  };

  // Callback after analysis completes
  const handleAnalysisComplete = () => {
    console.log('📱 App.jsx - Analysis generation completed, resetting flag');
    setShouldGenerateAnalysis(false);
  };

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show password gate if not authenticated
  if (!isAuthenticated) {
    return (
      <PasswordGate
        onSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  // Show game info modal if authenticated and modal should be shown
  if (showGameInfoModal) {
    return (
      <GameInfoModal
        onSubmit={handleGameInfoSubmit}
        onSkip={handleGameInfoSkip}
      />
    );
  }

  // Show dashboard if authenticated and game info collected
  return (
    <ErrorBoundary>
      <Dashboard
        gameInfoData={gameInfoData}
        onRefresh={handleRefresh}
        shouldGenerateAnalysis={shouldGenerateAnalysis}
        onAnalysisComplete={handleAnalysisComplete}
        onAddGame={handleAddGame}
      />
    </ErrorBoundary>
  );
}

export default App;
