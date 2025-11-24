# ✅ Vercel Deployment Checklist

Quick checklist to ensure successful deployment.

---

## 🔧 Before Deploying

- [ ] Google Cloud Project created
- [ ] Google Sheets API enabled in Cloud Console
- [ ] Service Account created with JSON credentials downloaded
- [ ] Google Sheet shared with service account email (found in credentials.json as `client_email`)
- [ ] Gemini API key obtained from https://makersuite.google.com/app/apikey
- [ ] Vercel account created
- [ ] Strong master password chosen (12+ characters recommended)

---

## 📝 Prepare Credentials

- [ ] Convert credentials to Base64:
  ```bash
  cat your-credentials.json | base64 | tr -d '\n' > credentials-base64.txt
  ```
- [ ] Generate session secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Copy both outputs somewhere safe (you'll need them for Vercel)

---

## 🌐 Vercel Setup

- [ ] Project deployed to Vercel (first deployment can fail - that's OK)
- [ ] Got Vercel app URL (e.g., `https://ngauge.vercel.app`)

---

## 🔐 Environment Variables Added in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables:

### Google Sheets
- [ ] `VITE_GOOGLE_SHEET_ID` = Your Google Sheet ID from URL
- [ ] `GOOGLE_CREDENTIALS_BASE64` = Contents of `credentials-base64.txt`
- [ ] `VITE_GOOGLE_BASELINE_SHEET` = `Monthly template` (or `Baseline` if that's your sheet name)

### AI Configuration
- [ ] `GEMINI_API_KEY` = Your Gemini API key

### Authentication
- [ ] `NGAUGE_MASTER_PASSWORD` = Your chosen password
- [ ] `SESSION_SECRET_KEY` = Output from crypto command
- [ ] `SESSION_EXPIRY_DAYS` = `7` (or your preferred number)

### Backend Configuration
- [ ] `VITE_BACKEND_URL` = **EMPTY** (leave blank, no space!)
- [ ] `NODE_ENV` = `production`
- [ ] `FRONTEND_URL` = Your Vercel URL (e.g., `https://ngauge.vercel.app`)

---

## 🔄 After Adding Variables

- [ ] Redeploy from Vercel Dashboard:
  - Go to **Deployments** tab
  - Click **"..."** on latest deployment
  - Click **"Redeploy"**
  - Wait for deployment to complete ✅

---

## ✅ Test Deployment

Open these URLs and verify they work:

- [ ] **App**: `https://your-app.vercel.app` → Shows password gate
- [ ] **Health**: `https://your-app.vercel.app/api/health` → Returns `{"status":"ok"}`
- [ ] **Sheets**: `https://your-app.vercel.app/api/sheets` → Returns data from "Weekly" tab
- [ ] **Baseline**: `https://your-app.vercel.app/api/baseline` → Returns baseline data or empty

### Test Full Flow

- [ ] Open app in browser
- [ ] Enter master password
- [ ] See dashboard with chemistry scores
- [ ] Scroll to "THINGS TO LOOK OUT FOR"
- [ ] See "Analyzing..." appear automatically
- [ ] See Player Notes Summary appear after ~5 seconds
- [ ] See Suggestions for Progress appear
- [ ] Click "Generate Insights" button to test manual refresh

---

## 🐛 If Something Doesn't Work

Check these common issues:

- [ ] `VITE_BACKEND_URL` is **EMPTY** (not localhost!)
- [ ] Google Sheet has a tab named exactly "Weekly" (case-sensitive)
- [ ] Service account email has access to the sheet (check Share settings)
- [ ] All environment variables are saved in Vercel
- [ ] You redeployed after adding environment variables
- [ ] Check Vercel Function Logs for detailed errors

---

## 🎉 Success!

Once all items are checked, your app is live and working from any computer!

**Share your app URL with your team**: `https://your-app.vercel.app`

---

## 📋 Environment Variables Quick Reference

```bash
# Copy-paste template for Vercel Dashboard

VITE_GOOGLE_SHEET_ID=
GOOGLE_CREDENTIALS_BASE64=
VITE_GOOGLE_BASELINE_SHEET=Monthly template
GEMINI_API_KEY=
NGAUGE_MASTER_PASSWORD=
SESSION_SECRET_KEY=
SESSION_EXPIRY_DAYS=7
VITE_BACKEND_URL=
NODE_ENV=production
FRONTEND_URL=
```

**Remember**:
- `VITE_BACKEND_URL` must be **completely empty**
- `FRONTEND_URL` should be your actual Vercel URL
- All values should have NO quotes around them in Vercel Dashboard
