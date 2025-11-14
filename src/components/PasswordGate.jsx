/**
 * PasswordGate Component
 *
 * Professional authentication gate with blurred background
 * Displays before Dashboard until user authenticates
 *
 * FEATURES:
 * - Backdrop blur effect
 * - Clean, centered modal design
 * - Error handling with fade-in animation
 * - Loading states
 * - Keyboard support (Enter to submit)
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Dashboard from './Dashboard';

function PasswordGate({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Focus password input on mount
  useEffect(() => {
    const input = document.getElementById('password-input');
    if (input) {
      input.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous error
    setError('');

    // Validate password field
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsLoading(true);

    try {
      // Get backend URL from environment
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      const apiUrl = `${backendUrl}/api/auth/verify`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - notify parent component
        onSuccess();
      } else {
        // Failed authentication
        if (response.status === 429) {
          // Rate limited
          setError(data.message || 'Too many attempts. Please try again later.');
        } else {
          // Invalid password
          const remainingText = data.remainingAttempts !== undefined
            ? ` (${data.remainingAttempts} attempt${data.remainingAttempts !== 1 ? 's' : ''} remaining)`
            : '';
          setError(`Invalid password${remainingText}`);
        }

        // Clear password field on error
        setPassword('');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Unable to connect to authentication service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Actual Dashboard in background (blurred) */}
      <div className="absolute inset-0">
        <Dashboard />
      </div>

      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[20px] bg-black/40"></div>

      {/* Authentication modal */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-black/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 sm:p-10">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/Ntangible.png"
              alt="Ntangible Logo"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
            NGauge Access
          </h1>

          <p className="text-slate-300 text-center mb-8 text-sm">
            Enter password to continue
          </p>

          {/* Password form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                id="password-input"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter password"
                disabled={isLoading}
                className={`
                  w-full px-4 py-3 rounded-lg
                  bg-white/10 backdrop-blur-sm
                  border-2 border-white/20
                  text-white placeholder-white
                  focus:outline-none focus:border-white focus:ring-2 focus:ring-white/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  text-base
                `}
                autoComplete="off"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="animate-fadeIn">
                <div className="px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/50 backdrop-blur-sm">
                  <p className="text-red-200 text-sm text-center font-medium">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={`
                w-full py-3 px-4 rounded-lg
                font-semibold text-white text-base
                bg-gradient-to-r from-blue-500 to-blue-600
                hover:from-blue-600 hover:to-blue-700
                focus:outline-none focus:ring-4 focus:ring-blue-500/50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                shadow-lg hover:shadow-xl
                ${isLoading ? 'cursor-wait' : ''}
              `}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Enter'
              )}
            </button>
          </form>

          {/* Footer text */}
          <div className="mt-8 text-center">
            <p className="text-white text-sm">
              Contact the NGauge team for access
            </p>
          </div>
        </div>

        {/* Subtle branding */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-xs">
            Secured with HTTP-only cookies
          </p>
        </div>
      </div>

      {/* Custom CSS for fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

PasswordGate.propTypes = {
  onSuccess: PropTypes.func.isRequired,
};

export default PasswordGate;
