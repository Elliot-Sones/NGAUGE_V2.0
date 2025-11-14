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
import ErrorBoundary from './components/ErrorBoundary';
import { checkAuthStatus } from './services/authService';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, true/false = auth state
  const [isChecking, setIsChecking] = useState(true);

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

  // Show dashboard if authenticated
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;
