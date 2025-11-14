/**
 * Vercel Serverless Function: /api/auth/logout
 *
 * Clears session cookie to log out user
 *
 * SECURITY:
 * - Simply expires the cookie immediately
 * - Stateless design (no server-side session invalidation needed)
 */

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Allow POST or GET for logout
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Clear cookie by setting Max-Age to 0
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'ngauge_session=',
      'Max-Age=0',
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      isProduction ? 'Secure' : ''
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Error during logout:', error);

    return res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'An error occurred'
    });
  }
}
