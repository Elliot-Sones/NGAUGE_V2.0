# Setup Guide - Getting Your Google Sheets API Key

This guide will walk you through setting up Google Sheets API access for NGauge.

## Option 1: Google Sheets API Key (Recommended for Public Sheets)

### Step 1: Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create or Select a Project

1. Click the project dropdown at the top
2. Click "New Project" or select existing project "ngauge"
3. If creating new:
   - Name: "NGauge"
   - Click "Create"

### Step 3: Enable Google Sheets API

1. In the left sidebar, click "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on "Google Sheets API"
4. Click "Enable"

### Step 4: Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key that appears
4. (Optional) Click "Restrict Key" to add security:
   - Under "API restrictions", select "Restrict key"
   - Check "Google Sheets API"
   - Click "Save"

### Step 5: Make Your Sheet Publicly Accessible

1. Open your Google Sheet
2. Click "Share" button (top right)
3. Click "Change to anyone with the link"
4. Set to "Viewer"
5. Click "Done"

### Step 6: Add API Key to Your Project

1. Open `.env` file in your project
2. Find the line: `VITE_GOOGLE_API_KEY=`
3. Paste your API key: `VITE_GOOGLE_API_KEY=your_api_key_here`
4. Save the file

### Step 7: Test Your Setup

```bash
npm run dev
```

The dashboard should load with your Google Sheets data!

---

## Option 2: Service Account (For Private Sheets)

You already have a service account file: `regal-state-476817-j3-0ec41d121201.json`

### Additional Steps Needed:

1. **Share your Google Sheet with the service account email**:
   - Open your Google Sheet
   - Click "Share"
   - Find the email in your service account JSON file (look for "client_email")
   - It looks like: `something@project-id.iam.gserviceaccount.com`
   - Add this email as a Viewer
   - Click "Send"

2. **Update the data service**:

The current implementation uses API key. To use service account, you'll need a backend server because service accounts require private keys that shouldn't be exposed in the browser.

**Quick Backend Option** (Node.js):

Create `server.js` in your project root:

```javascript
import express from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import cors from 'cors';

const app = express();
app.use(cors());

const credentials = JSON.parse(
  fs.readFileSync('./regal-state-476817-j3-0ec41d121201.json')
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

app.get('/api/sheets', async (req, res) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.VITE_GOOGLE_SHEET_ID,
      range: 'Sheet1',
    });
    res.json(response.data.values);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));
```

Then update `src/services/dataService.js` to use `fetch('/api/sheets')`.

---

## Troubleshooting

### "Failed to fetch data" Error

**Check:**
- Is your API key correct in `.env`?
- Is the Google Sheets API enabled in Google Cloud Console?
- Is your sheet shared publicly (anyone with link can view)?
- Is your sheet ID correct in `.env`?

**Test your API key:**
```bash
# Replace YOUR_API_KEY and YOUR_SHEET_ID
curl "https://sheets.googleapis.com/v4/spreadsheets/YOUR_SHEET_ID/values/Sheet1?key=YOUR_API_KEY"
```

### CORS Error

If you see CORS errors:
- This usually means the API key is working
- The issue is browser security
- Solution: Make sure you're using `https://` not `http://` for the API call
- Or use a backend server (Option 2)

### 403 Forbidden Error

**Causes:**
- Sheet is not publicly accessible
- API key restrictions are too strict
- Wrong sheet ID

**Fix:**
- Double-check sheet sharing settings
- Remove API key restrictions temporarily to test
- Verify sheet ID in URL matches `.env`

### Mock Data Appears Instead of Real Data

This means the API call failed and the app fell back to mock data.

**Check browser console** for the actual error message.

---

## Verification Checklist

Before asking for help, verify:

- [ ] Google Sheets API is enabled in Google Cloud Console
- [ ] API key is created and copied correctly
- [ ] API key is added to `.env` file
- [ ] Sheet is shared publicly (anyone with link can view)
- [ ] Sheet ID in `.env` matches your actual sheet
- [ ] `.env` file is in the project root
- [ ] You've restarted the dev server after changing `.env`
- [ ] Browser console shows no errors

---

## Security Best Practices

### For API Keys:

1. **Never commit API keys to Git**
   - Already protected by `.gitignore`
   - Double-check before pushing code

2. **Restrict your API key**:
   - Go to Google Cloud Console
   - Edit your API key
   - Add "HTTP referrer" restrictions for your domain
   - Restrict to "Google Sheets API" only

3. **Rotate keys periodically**:
   - Create new key
   - Update `.env`
   - Delete old key

### For Service Accounts:

1. **Never commit service account JSON**
   - Already protected by `.gitignore`
   - Extra important because it contains private keys

2. **Minimal permissions**:
   - Only grant "Viewer" access to sheets
   - Don't give "Editor" unless needed

3. **Use backend server**:
   - Don't expose service account credentials in browser
   - Use a Node.js/Python backend to make API calls

---

## Next Steps

Once your setup is working:

1. Customize calculations in `src/utils/calculations.js`
2. Add insights in `generateInsights()` function
3. Adjust color thresholds in `src/config/constants.js`
4. Deploy to Vercel (see README.md)

---

## Getting Help

If you're still stuck:

1. Check the browser console for error messages
2. Review the [README.md](README.md) for architecture overview
3. Check [CUSTOMIZATION.md](CUSTOMIZATION.md) for common changes
4. Google the specific error message

## Useful Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
