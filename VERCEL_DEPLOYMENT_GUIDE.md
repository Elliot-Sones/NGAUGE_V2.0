# 🚀 Complete Vercel Deployment Guide for NGauge

This guide will help you deploy NGauge to Vercel so it works on any computer.

---

## 📋 Prerequisites

Before deploying, make sure you have:

- [ ] Google Cloud Project with Sheets API enabled
- [ ] Service Account JSON credentials file
- [ ] Google Sheet shared with service account email
- [ ] Gemini API key
- [ ] Vercel account (free tier works fine)
- [ ] All environment variables from `.env` file

---

## 🔧 Step 1: Prepare Google Cloud Credentials for Vercel

Vercel can't use the JSON credentials file directly. You need to encode it as Base64:

### On Mac/Linux:
```bash
cat your-credentials.json | base64 | tr -d '\n' > credentials-base64.txt
```

### On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("your-credentials.json")) | Out-File -Encoding ASCII credentials-base64.txt
```

This creates a `credentials-base64.txt` file with your encoded credentials.

**⚠️ IMPORTANT:** Keep this file secure and never commit it to Git!

---

## 📝 Step 2: Prepare All Environment Variables

You'll need to add these to Vercel Dashboard. Here's the complete list:

### Required Variables

```bash
# Google Sheets Configuration
VITE_GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_CREDENTIALS_BASE64=paste_contents_of_credentials-base64.txt_here

# Optional: Baseline sheet name (defaults to "Baseline")
VITE_GOOGLE_BASELINE_SHEET=Monthly template

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Authentication
NGAUGE_MASTER_PASSWORD=your_secure_password_here
SESSION_SECRET_KEY=generate_with_command_below
SESSION_EXPIRY_DAYS=7

# Backend Configuration (IMPORTANT!)
VITE_BACKEND_URL=
# ^ Leave this EMPTY (empty string) for Vercel!

# Environment
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://your-app-name.vercel.app
# ^ Replace with your actual Vercel URL after first deployment
```

### Generate Session Secret

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `SESSION_SECRET_KEY`.

---

## 🌐 Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended for first time)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Click "Add New Project"**

3. **Import your Git repository** (GitHub, GitLab, or Bitbucket)

4. **Configure Project:**
   - Framework Preset: **Vite**
   - Root Directory: `./` (leave as default)
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Click "Deploy"** (it will fail first time - that's OK!)

6. **Add Environment Variables:**
   - Go to: **Project Settings** → **Environment Variables**
   - Add ALL variables from Step 2 above
   - For `GOOGLE_CREDENTIALS_BASE64`: Paste the entire contents of `credentials-base64.txt`
   - For `VITE_BACKEND_URL`: Leave it **completely empty** (don't put a space, just empty)
   - For `FRONTEND_URL`: Use your Vercel app URL (e.g., `https://ngauge.vercel.app`)

7. **Redeploy:**
   - Go to **Deployments** tab
   - Click the three dots (**...**) on the latest deployment
   - Click **"Redeploy"**
   - Wait for deployment to complete

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Follow the prompts:
# - Link to existing project? No
# - Project name? ngauge (or your preferred name)
# - Directory to deploy? ./ (current directory)
```

After deployment, add environment variables in the dashboard (same as Option A, step 6-7).

---

## ✅ Step 4: Verify Deployment

### Test All Endpoints

Open these URLs in your browser (replace `your-app.vercel.app` with your actual URL):

1. **Frontend**: https://your-app.vercel.app
   - Should show password gate

2. **Health Check**: https://your-app.vercel.app/api/health
   - Should return: `{"status":"ok","timestamp":"..."}`

3. **Sheets API**: https://your-app.vercel.app/api/sheets
   - Should return: `{"success":true,"values":[...]}`

4. **Baseline API**: https://your-app.vercel.app/api/baseline
   - Should return: `{"success":true,"hasBaseline":true/false,"values":[...]}`

### Test Authentication Flow

1. Open your app: https://your-app.vercel.app
2. Enter your `NGAUGE_MASTER_PASSWORD`
3. Should see dashboard with data
4. Check "THINGS TO LOOK OUT FOR" section
5. Should automatically see "Analyzing..." and then insights

---

## 🔍 Troubleshooting

### Issue 1: "Failed to fetch data"

**Cause:** Google Sheets API not working

**Solutions:**
- ✅ Verify `GOOGLE_CREDENTIALS_BASE64` is set correctly in Vercel
- ✅ Check that Google Sheet is shared with service account email
- ✅ Verify `VITE_GOOGLE_SHEET_ID` is correct
- ✅ Check Vercel Function Logs for detailed error

### Issue 2: "CORS Error" in browser console

**Cause:** Frontend URL not whitelisted

**Solutions:**
- ✅ Set `FRONTEND_URL` to your actual Vercel URL in environment variables
- ✅ Redeploy after adding the variable
- ✅ Make sure URL doesn't have trailing slash

### Issue 3: API calls go to localhost

**Cause:** `VITE_BACKEND_URL` is set to localhost

**Solutions:**
- ✅ Set `VITE_BACKEND_URL` to **empty string** (not localhost!) in Vercel
- ✅ Redeploy after changing
- ✅ Clear browser cache

### Issue 4: "401 Unauthorized" on login

**Cause:** Password or session secret not configured

**Solutions:**
- ✅ Verify `NGAUGE_MASTER_PASSWORD` is set in Vercel
- ✅ Verify `SESSION_SECRET_KEY` is set (generated with crypto command)
- ✅ Redeploy after adding variables

### Issue 5: Insights don't generate

**Cause:** Gemini API key not configured

**Solutions:**
- ✅ Verify `GEMINI_API_KEY` is set in Vercel
- ✅ Check that API key is valid at https://makersuite.google.com/app/apikey
- ✅ Check Vercel Function Logs for errors

### Issue 6: "No data found"

**Cause:** Sheet tab name is wrong

**Solutions:**
- ✅ Verify your Google Sheet has a tab named "Weekly" (case-sensitive!)
- ✅ Check that "Weekly" tab has data
- ✅ Verify the sheet structure matches expected format

---

## 📊 Viewing Logs

To debug issues, check Vercel Function Logs:

1. Go to **Vercel Dashboard**
2. Click your project
3. Click **"Logs"** tab (or **"Functions"** → select a function)
4. Filter by:
   - `/api/sheets` - Data fetching logs
   - `/api/baseline` - Baseline data logs
   - `/api/analyze` - AI insights logs
   - `/api/auth/*` - Authentication logs

---

## 🔐 Security Best Practices

### Protect Your Environment Variables

- ✅ Never commit `.env` files to Git
- ✅ Never share your `GOOGLE_CREDENTIALS_BASE64` publicly
- ✅ Never share your `GEMINI_API_KEY` publicly
- ✅ Use a strong master password (12+ characters)
- ✅ Rotate session secret key periodically

### Update CORS Settings

After first deployment, update `FRONTEND_URL`:

```bash
# In Vercel Dashboard, update:
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
```

Then redeploy.

---

## 🔄 Updating Your Deployment

### Push Changes

Vercel automatically redeploys when you push to your Git repository:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Vercel will detect the push and redeploy automatically.

### Manual Redeploy

If you need to redeploy without code changes (e.g., after updating environment variables):

1. Go to **Vercel Dashboard** → **Deployments**
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**

---

## 📱 Custom Domain (Optional)

To use your own domain instead of `.vercel.app`:

1. Go to **Vercel Dashboard** → **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain name
4. Follow DNS configuration instructions
5. Update `FRONTEND_URL` environment variable to match your custom domain

---

## 📈 Monitoring

### Check App Health

- **Uptime**: Vercel provides 99.99% uptime
- **Function Logs**: Available in Vercel Dashboard
- **Analytics**: Enable in Project Settings → Analytics

### API Usage

Monitor Google Sheets API and Gemini API usage:

- **Google Sheets**: https://console.cloud.google.com/apis/dashboard
- **Gemini AI**: https://makersuite.google.com/app/apikey (quota info)

---

## 🎉 You're Done!

Your NGauge app should now be:

✅ Deployed to Vercel
✅ Accessible from any computer
✅ Pulling data from Google Sheets
✅ Generating AI insights automatically
✅ Secured with password authentication

**Your app URL**: `https://your-app-name.vercel.app`

Share this URL with your team - they can access it from anywhere!

---

## 📞 Need Help?

If you run into issues:

1. Check the **Troubleshooting** section above
2. Review **Vercel Function Logs** for detailed errors
3. Verify all environment variables are set correctly
4. Try a manual redeploy after changing variables
5. Check that Google Sheet is shared with service account

---

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com
- **Gemini API Keys**: https://makersuite.google.com/app/apikey
- **Vercel Documentation**: https://vercel.com/docs

---

**Last Updated**: 2025
