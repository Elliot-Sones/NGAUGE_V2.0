# NGauge Authentication Setup Guide

This document explains the password authentication system implemented for the NGauge Team Chemistry Dashboard.

## Overview

The NGauge dashboard now includes a **professional password gate** that protects access to the application. Users must authenticate with a master password before accessing the dashboard.

### Key Features

- **HTTP-only Session Cookies**: Secure, browser-managed sessions
- **HMAC-Signed Tokens**: Cryptographically secure session validation
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **Clean UI**: Professional blur effect with centered authentication modal
- **Auto-generated Secrets**: Fallback for development if SESSION_SECRET_KEY not set
- **7-Day Sessions**: Configurable session expiry (default: 7 days)

---

## Architecture

### Authentication Flow

```
1. User visits site
   ↓
2. Frontend checks session status (GET /api/auth/status)
   ↓
3a. Valid session → Show Dashboard
3b. No/invalid session → Show PasswordGate
   ↓
4. User enters password
   ↓
5. POST /api/auth/verify → Backend validates
   ↓
6a. Valid → Set HTTP-only cookie → Show Dashboard
6b. Invalid → Show error, decrement attempts
```

### Security Implementation

| Feature | Implementation |
|---------|----------------|
| **Password Storage** | Environment variable only (never in frontend) |
| **Session Tokens** | HMAC-SHA256 signed with timestamp + expiry |
| **Cookie Security** | HttpOnly, Secure (prod), SameSite=Strict |
| **Rate Limiting** | 5 attempts per 15 min per IP |
| **Timing Attacks** | Constant-time password comparison |
| **CSRF Protection** | SameSite=Strict cookies |

---

## Setup Instructions

### 1. Local Development

**Step 1: Set Environment Variables**

Add these to your `.env` file:

```bash
# Master password (users will enter this)
NGAUGE_MASTER_PASSWORD=your_secure_password_here

# Session secret key (for signing tokens)
SESSION_SECRET_KEY=your_64_character_hex_secret_here

# Session expiry (optional, default: 7 days)
SESSION_EXPIRY_DAYS=7
```

**Step 2: Generate Session Secret**

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the value for `SESSION_SECRET_KEY`.

**Step 3: Test Locally**

```bash
# Terminal 1: Start backend server
npm run server

# Terminal 2: Start frontend dev server
npm run dev
```

Visit `http://localhost:3000` and you should see the password gate.

**Test Credentials:**
- Password: `ngauge2025` (or whatever you set in `.env`)

---

### 2. Vercel Production Deployment

**Step 1: Add Environment Variables to Vercel**

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add the following variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NGAUGE_MASTER_PASSWORD` | Your secure password | Production, Preview, Development |
| `SESSION_SECRET_KEY` | Your generated hex secret | Production, Preview, Development |
| `SESSION_EXPIRY_DAYS` | `7` (or custom) | Production, Preview, Development |

**Step 2: Deploy**

```bash
git add .
git commit -m "Add password authentication"
git push
```

Vercel will automatically deploy with the new authentication system.

**Step 3: Test Production**

1. Visit your Vercel deployment URL
2. You should see the password gate
3. Enter the password you set in Vercel environment variables
4. You should be authenticated and see the dashboard

---

## API Endpoints

### POST /api/auth/verify

Verifies password and creates session cookie.

**Request:**
```json
{
  "password": "your_password"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "expiresIn": 604800000
}
```

**Response (Invalid Password):**
```json
{
  "success": false,
  "error": "Invalid password",
  "remainingAttempts": 4
}
```

**Response (Rate Limited):**
```json
{
  "success": false,
  "error": "Too many attempts",
  "message": "Please try again in 12 minutes",
  "retryAfter": 720
}
```

---

### GET /api/auth/status

Checks if user has valid session.

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "expiresAt": 1763660640106,
  "remainingTime": 604795827
}
```

**Response (Not Authenticated):**
```json
{
  "authenticated": false,
  "reason": "No session cookie"
}
```

---

### POST /api/auth/logout

Clears session cookie and logs out user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## File Structure

### New Files Created

```
NGAUGE-v2/
├── api/
│   └── auth/
│       ├── verify.js          # Password verification endpoint
│       ├── status.js          # Session status check endpoint
│       └── logout.js          # Logout endpoint
│
├── src/
│   ├── components/
│   │   └── PasswordGate.jsx   # Authentication UI component
│   │
│   └── services/
│       └── authService.js     # Frontend auth API wrapper
│
└── AUTH_SETUP.md              # This file
```

### Modified Files

- `src/App.jsx` - Added authentication flow
- `server.js` - Added auth endpoints for local dev
- `vercel.json` - Added auth route rewrites
- `.env.example` - Added auth environment variables
- `.env` - Added auth configuration

---

## Testing

### Manual Testing

**Test 1: Invalid Password**
```bash
curl -X POST http://localhost:3002/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"wrongpassword"}'
```

Expected: `{"success":false,"error":"Invalid password","remainingAttempts":4}`

**Test 2: Valid Password**
```bash
curl -X POST http://localhost:3002/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"ngauge2025"}' \
  -c cookies.txt
```

Expected: `{"success":true,"message":"Authentication successful",...}`

**Test 3: Check Session**
```bash
curl http://localhost:3002/api/auth/status -b cookies.txt
```

Expected: `{"authenticated":true,...}`

**Test 4: Logout**
```bash
curl -X POST http://localhost:3002/api/auth/logout -b cookies.txt -c cookies.txt
```

Expected: `{"success":true,"message":"Logged out successfully"}`

---

## Security Considerations

### Password Best Practices

- **Minimum 12 characters** recommended
- Use a mix of uppercase, lowercase, numbers, and symbols
- Don't reuse passwords from other services
- Store securely (password manager recommended)

### Session Management

- Sessions expire after 7 days (configurable)
- HTTP-only cookies cannot be accessed by JavaScript
- Secure flag ensures cookies only sent over HTTPS in production
- SameSite=Strict prevents CSRF attacks

### Rate Limiting

- 5 failed login attempts per 15 minutes per IP
- Prevents brute-force attacks
- No lockout mechanism (attempts reset after 15 min)

### Token Signing

- HMAC-SHA256 signature prevents token tampering
- Tokens include expiration timestamp
- Constant-time comparison prevents timing attacks

---

## Troubleshooting

### Issue: "Authentication service not configured"

**Cause:** `NGAUGE_MASTER_PASSWORD` not set in environment variables.

**Solution:**
1. Check your `.env` file has `NGAUGE_MASTER_PASSWORD=...`
2. Restart the backend server: `npm run server`
3. For Vercel: Add variable in dashboard and redeploy

---

### Issue: "Session expires immediately"

**Cause:** `SESSION_SECRET_KEY` changing between requests (auto-generated).

**Solution:**
1. Generate a fixed secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Add to `.env`: `SESSION_SECRET_KEY=your_generated_secret`
3. Restart server

---

### Issue: "Cannot connect to authentication service"

**Cause:** Backend server not running or CORS issue.

**Solution:**
1. Ensure backend is running: `npm run server` (should show auth endpoints)
2. Check `VITE_BACKEND_URL` in `.env` matches backend URL
3. For production: Ensure same domain for frontend and API (Vercel handles this)

---

### Issue: Rate limited after 5 attempts

**Cause:** Exceeded 5 login attempts in 15 minutes.

**Solution:**
- Wait 15 minutes for the rate limit to reset
- For development: Restart the server to clear rate limit store

---

## Customization

### Change Session Expiry

In `.env`:
```bash
SESSION_EXPIRY_DAYS=30  # 30 days instead of 7
```

### Change Password

1. Update `NGAUGE_MASTER_PASSWORD` in `.env` (local) or Vercel dashboard (production)
2. Redeploy/restart
3. Share new password with team members

### Add Logout Button to Dashboard

In `src/components/Dashboard.jsx`:

```jsx
import { logout } from '../services/authService';

function Dashboard() {
  const handleLogout = async () => {
    await logout();
    window.location.reload(); // Refresh to show password gate
  };

  return (
    <div>
      {/* Your dashboard code */}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

---

## Future Enhancements (Optional)

- [ ] Multi-user support with database
- [ ] Password reset mechanism
- [ ] Two-factor authentication (2FA)
- [ ] Activity logging
- [ ] Session management UI (view/revoke active sessions)
- [ ] Email notifications on login
- [ ] IP whitelist/blacklist

---

## Support

For issues or questions:
1. Check this documentation first
2. Review `.env.example` for correct variable names
3. Check browser console for frontend errors
4. Check server logs for backend errors

---

**Generated by Claude Code**
**Last Updated:** 2025-11-13
