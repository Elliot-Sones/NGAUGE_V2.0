# Running NGauge with Google Sheets Integration

Your NGauge dashboard is now configured to fetch real data from Google Sheets using service account authentication!

## ✅ What's Working

- ✅ Backend server with Google Sheets API integration
- ✅ Service account authentication (secure)
- ✅ Frontend dashboard displaying player data
- ✅ Real-time data updates every 5 seconds
- ✅ 25 players being fetched from your Google Sheet

## 🚀 How to Run

You need to run **TWO servers** simultaneously:

### Terminal 1: Backend Server (Port 3001)
```bash
npm run server
```

This starts the Node.js backend that:
- Connects to Google Sheets using service account credentials
- Exposes API at `http://localhost:3001/api/sheets`
- Handles authentication securely

### Terminal 2: Frontend Dashboard (Port 3000)
```bash
npm run dev
```

This starts the Vite development server that:
- Serves the React dashboard at `http://localhost:3000`
- Fetches data from the backend API
- Auto-refreshes when you make code changes

## 📊 Current Data

Your Google Sheet has:
- **25 Players** (P001 - P025)
- **Questions 2-6** with numeric scores (1-10)
- **Questions 1 & 7** with text responses (not shown in dashboard)

The dashboard converts the 1-10 scores to a 0-100 scale by multiplying by 10.

## 🔧 Configuration

The app uses these environment variables from `.env`:

```env
VITE_GOOGLE_SHEET_ID=13WmxejOq6Lm8xVffSzaXsbFnLkJ-A9a_KREEG0n73-I
VITE_GOOGLE_CREDENTIALS_PATH=./regal-state-476817-j3-0ec41d121201.json
VITE_POLLING_INTERVAL=5000
VITE_BACKEND_URL=http://localhost:3001
```

## 🌐 Open in Browser

Once both servers are running:
1. Open http://localhost:3000 in your browser
2. You should see 25 player cards with chemistry scores
3. Data refreshes automatically every 5 seconds

## 🛠️ Troubleshooting

### Backend server won't start
- Make sure `regal-state-476817-j3-0ec41d121201.json` exists in project root
- Check that port 3001 is not in use

### Frontend shows "Backend unavailable"
- Make sure backend server is running on port 3001
- Check browser console for errors
- Verify `VITE_BACKEND_URL` in `.env` is correct

### No data displaying
- Check browser console for error messages
- Verify backend is returning data: `curl http://localhost:3001/api/sheets`
- Make sure service account has access to the Google Sheet

## 📝 Notes

- The backend server must be running for the frontend to fetch real data
- If backend is down, the frontend will fall back to mock data
- Player scores are chemistry scores (0-100 scale)
- Color coding: Green (80+), Orange (60-79), Red (<60)

## 🎯 Next Steps

To make this production-ready:
1. Deploy backend to a service like Heroku, Railway, or Vercel
2. Update `VITE_BACKEND_URL` to your deployed backend URL
3. Deploy frontend to Vercel, Netlify, or GitHub Pages
4. Set environment variables in your hosting platform
