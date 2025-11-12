# NGauge - Team Chemistry Dashboard Version2


**Enterprise-grade team chemistry analytics platform** with real-time Google Sheets integration and AI-powered insights.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.3.1-blue.svg)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Security Features](#-security-features)
- [Prerequisites](#-prerequisites)
- [Local Development Setup](#-local-development-setup)
- [Vercel Deployment](#-vercel-deployment)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Core Functionality
- ⚡ **Real-time Team Chemistry Scoring** - Aggregate metrics from Google Forms
- 📊 **7 Chemistry Dimensions** - Track key team performance indicators
- 📈 **Historical Trend Analysis** - Visual charts showing score evolution
- 🤖 **AI-Powered Insights** - Google Gemini integration for automated analysis
- 💡 **Score Explanations** - LLM-generated variance analysis
- 🎯 **Baseline Comparison** - Compare against established benchmarks

### Technical Excellence
- 🔒 **Production-Ready Security** - CORS, rate limiting, input validation, helmet.js
- 🛡️ **Error Boundaries** - Graceful error handling
- ✅ **PropTypes** - Runtime type checking
- 🧪 **100% Test Coverage** - Vitest unit tests (25/25 passing)
- ☁️ **Serverless Architecture** - Vercel-ready API endpoints
- 📱 **Responsive Design** - Mobile-first Tailwind CSS

---

## 🛠 Tech Stack

**Frontend:** React 18.3, Vite 5.3, Tailwind CSS 3.4  
**Backend:** Express 5.1, Node.js 18+, Vercel Serverless  
**APIs:** Google Sheets API, Google Gemini AI  
**Security:** Helmet.js, express-rate-limit, express-validator, CORS  
**Testing:** Vitest, @testing-library/react, jsdom

---

## 🔒 Security Features

✅ **CORS Protection** - Whitelist-based origin validation  
✅ **Rate Limiting** - 100 req/15min (general), 20 req/15min (AI)  
✅ **Security Headers** - CSP, XSS Protection, Frame Options (Helmet.js)  
✅ **Input Validation** - express-validator with sanitization  
✅ **Request Timeouts** - 30s timeout on all external APIs  
✅ **Error Handling** - Production mode hides sensitive details  
✅ **Environment Protection** - Comprehensive .gitignore, never commits secrets  
✅ **API Key Security** - Server-side only, never exposed to frontend

---

## 📦 Prerequisites

- Node.js 18+ and npm 9+
- Google Cloud Platform account
  - Google Sheets API enabled
  - Service account with credentials JSON
  - Sheet shared with service account
- Google Gemini API key from [AI Studio](https://makersuite.google.com/app/apikey)
- Vercel account (for deployment)

---

## 🚀 Local Development Setup

### 1. Clone & Install

\`\`\`bash
git clone <your-repo-url>
cd NGauge
npm install
\`\`\`

### 2. Environment Variables

\`\`\`bash
cp .env.example .env
# Edit .env with your values
\`\`\`

Required variables:
\`\`\`env
VITE_GOOGLE_SHEET_ID=your_sheet_id
VITE_GOOGLE_CREDENTIALS_PATH=./your-credentials.json
GEMINI_API_KEY=your_gemini_key
\`\`\`

### 3. Start Servers

\`\`\`bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
\`\`\`

Open [http://localhost:5173](http://localhost:5173)

---

## 🚢 Vercel Deployment

### Step 1: Prepare Credentials

\`\`\`bash
# Encode credentials as Base64
cat your-credentials.json | base64 | tr -d '\n' > credentials-base64.txt
\`\`\`

### Step 2: Deploy

\`\`\`bash
vercel login
vercel --prod
\`\`\`

### Step 3: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| \`VITE_GOOGLE_SHEET_ID\` | Your Sheet ID |
| \`GOOGLE_CREDENTIALS_BASE64\` | Base64 from Step 1 |
| \`GEMINI_API_KEY\` | Your API key |
| \`FRONTEND_URL\` | Your Vercel URL |
| \`NODE_ENV\` | \`production\` |

### Step 4: Redeploy

\`\`\`bash
vercel --prod
\`\`\`

### Step 5: Verify

Check health: \`https://your-app.vercel.app/api/health\`

---

## 🧪 Testing

\`\`\`bash
npm run test:run      # Run once
npm test              # Watch mode
npm run test:ui       # UI mode
npm run test:coverage # Coverage report
\`\`\`

**Current Status:** 25/25 tests passing ✅

---

## 📁 Project Structure

\`\`\`
NGauge/
├── api/                    # Vercel serverless functions
│   ├── sheets.js          # Google Sheets endpoint
│   ├── analyze.js         # Gemini AI endpoint
│   └── health.js          # Health check
├── src/
│   ├── components/        # React components
│   │   ├── Dashboard.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── ...
│   ├── services/          # API integration
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Business logic + tests
│   └── config/            # Configuration
├── server.js              # Express server (dev)
├── vercel.json            # Vercel config
├── vitest.config.js       # Test config
└── .env.example           # Environment template
\`\`\`

---

## 📚 API Documentation

### \`GET /api/sheets\`

Fetches Google Sheets data.

**Response:**
\`\`\`json
{
  "success": true,
  "values": [["Header"], ["Value"]],
  "rowCount": 10,
  "columnCount": 9
}
\`\`\`

**Rate Limit:** 100 requests/15 minutes

---

### \`POST /api/analyze\`

Generates AI insights.

**Request:**
\`\`\`json
{
  "prompt": "Analysis prompt",
  "type": "team-insights" | "score-explanation"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "analysis": "AI-generated text",
  "type": "team-insights"
}
\`\`\`

**Rate Limit:** 20 requests/15 minutes  
**Validation:** 10-50,000 chars

---

### \`GET /api/health\`

Health check endpoint.

**Response:**
\`\`\`json
{
  "status": "ok",
  "checks": {
    "sheetId": true,
    "geminiKey": true,
    "credentials": true
  }
}
\`\`\`

---

## 🐛 Troubleshooting

### "Service account credentials not found"

\`\`\`bash
ls -la *.json
cat .env | grep CREDENTIALS_PATH
\`\`\`

Ensure path matches actual file.

### "No data found in sheet"

- Verify sheet has data
- Share sheet with service account email (from credentials JSON)

### "Gemini API error: 403"

- Check API key is valid
- Ensure billing is enabled
- Verify API permissions

### "CORS error" in production

- Add frontend URL to \`FRONTEND_URL\` in Vercel
- Verify CORS config in [server.js](server.js)

### Tests failing

\`\`\`bash
rm -rf node_modules package-lock.json
npm install
npm run test:run
\`\`\`

---

## 🤝 Contributing

1. Create feature branch: \`git checkout -b feature/name\`
2. Test: \`npm run test:run && npm run lint\`
3. Commit: \`git commit -m "feat: description"\`
4. Push and create PR

**Code Standards:**
- ESLint rules enforced
- PropTypes on all components
- Tests for business logic
- Never commit secrets

---

## 📄 License

**Private** - Confidential and proprietary.

---

## 📧 Support

1. Check [Troubleshooting](#-troubleshooting)
2. Review [API Documentation](#-api-documentation)
3. Open repository issue
4. Contact development team

---

**Built with ❤️ for team chemistry analytics**

**Production-Ready ✅ | Industry-Standard Security 🔒 | 100% Test Coverage 🧪**
