/**
 * Authentication Service
 *
 * Handles all authentication-related API calls
 *
 * FEATURES:
 * - Check authentication status
 * - Logout functionality
 * - Automatic backend URL detection (dev vs production)
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Check if user has valid session
 * @returns {Promise<{authenticated: boolean, expiresAt?: number, remainingTime?: number}>}
 */
export async function checkAuthStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/status`, {
      method: 'GET',
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      console.error('Auth status check failed:', response.status);
      return { authenticated: false };
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error checking auth status:', error);
    return { authenticated: false };
  }
}

/**
 * Logout user by clearing session cookie
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function logout() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      console.error('Logout failed:', response.status);
      return { success: false };
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error during logout:', error);
    return { success: false };
  }
}

/**
 * Verify password and create session
 * (Note: This is called directly from PasswordGate component)
 * @param {string} password
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function verifyPassword(password) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    return {
      success: response.ok && data.success,
      ...data,
    };

  } catch (error) {
    console.error('Error verifying password:', error);
    return {
      success: false,
      error: 'Unable to connect to authentication service',
    };
  }
}

export default {
  checkAuthStatus,
  logout,
  verifyPassword,
};
