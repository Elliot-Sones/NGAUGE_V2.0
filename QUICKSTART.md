# Quick Start Guide

Get your NGauge dashboard running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Google Sheets with team data
- Google Cloud account (free)

## 5-Minute Setup

### 1. Install Dependencies (30 seconds)

```bash
npm install
```

✅ Already done for you!

### 2. Set Up Google Sheets API (2 minutes)

**Quick Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project "ngauge"
3. Enable "Google Sheets API"
4. Create API Key
5. Copy the API key

**Detailed instructions**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)

### 3. Configure Your Sheet (1 minute)

Make sure your Google Sheet is structured like this:

| Player      | Question 1 | Question 2 | Question 3 |
|-------------|-----------|-----------|-----------|
| John Smith  | 85        | 92        | 78        |
| Sarah Lee   | 75        | 80        | 85        |

**Important:**
- First row = headers
- First column = player names
- Other cells = scores (0-100)

**Share your sheet:**
1. Click "Share" in Google Sheets
2. Set to "Anyone with the link can view"
3. Click "Done"

### 4. Add Your API Key (30 seconds)

Open `.env` file and add your API key:

```env
VITE_GOOGLE_API_KEY=YOUR_API_KEY_HERE
```

### 5. Run the App (30 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## What You'll See

- **Player Score Cards**: Each player with color-coded chemistry score
- **Trend Indicators**: Arrows showing improvement/decline
- **Team Overview**: Average scores and stats
- **Insights Panel**: Placeholder for your custom analysis

---

## First Customizations

### Change Color Thresholds

Edit `.env`:
```env
VITE_THRESHOLD_HIGH=85    # Green if >= 85
VITE_THRESHOLD_MEDIUM=70  # Orange if >= 70
```

### Change Update Frequency

Edit `.env`:
```env
VITE_POLLING_INTERVAL=3000  # Update every 3 seconds
```

### Add Custom Insights

Edit `src/utils/calculations.js`:

Find the `generateInsights()` function and add your logic:

```javascript
export function generateInsights(playerData) {
  const insights = [];

  if (playerData.teamAverage < 60) {
    insights.push({
      type: 'warning',
      category: 'Team Alert',
      message: 'Team chemistry below target',
      recommendation: 'Schedule team meeting'
    });
  }

  return insights;
}
```

---

## Using Mock Data (Testing Without API Key)

Don't have API key yet? No problem!

The app automatically uses mock data if:
- No API key is set
- API call fails
- Running in development mode

You'll see sample data with 5 players.

---

## Troubleshooting

### Not seeing your data?

1. Check browser console (F12) for errors
2. Verify API key in `.env`
3. Ensure sheet is publicly shared
4. Restart dev server: `Ctrl+C`, then `npm run dev`

### Build errors?

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS errors?

- Normal in development
- Will work fine in production
- Or add a backend (see SETUP_GUIDE.md)

---

## Next Steps

### Customize Your Dashboard

1. **[CUSTOMIZATION.md](CUSTOMIZATION.md)** - How to modify calculations, colors, and more
2. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed Google API setup
3. **[README.md](README.md)** - Complete documentation

### Deploy to Production

```bash
# Deploy to Vercel (recommended)
npm install -g vercel
vercel

# Or build for any static host
npm run build
# Upload the 'dist' folder
```

---

## File Structure Quick Reference

**Need to change...**

| What | File |
|------|------|
| Data source | `src/services/dataService.js` |
| Calculations | `src/utils/calculations.js` |
| Colors/thresholds | `src/config/constants.js` |
| UI components | `src/components/` |
| Environment vars | `.env` |

---

## Common Use Cases

### Weekly Team Check-ins

1. Have players fill out Google Form
2. Form responses go to Google Sheet
3. Dashboard updates automatically
4. Review trends at weekly meeting

### Real-time Tournament Tracking

1. Update Google Sheet during tournament
2. Dashboard shows live chemistry metrics
3. Identify issues immediately
4. Make coaching adjustments

### Season-long Analytics

1. Keep historical data in sheet
2. Track chemistry trends over time
3. Correlate with team performance
4. Data-driven team building

---

## Support

- **Questions?** Check the code comments (heavily documented)
- **Bugs?** Check browser console
- **Customization?** See CUSTOMIZATION.md
- **API Issues?** See SETUP_GUIDE.md

---

## That's It!

You now have a professional, real-time team chemistry dashboard! 🎉

**Pro Tip**: The code is heavily commented. When in doubt, read the comments in the files - they explain everything!
