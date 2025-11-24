# NGauge Team Chemistry Dashboard

## Overview

Professional, confidential team-level analytics dashboard that displays aggregate chemistry scores **without** revealing individual player responses.

## Key Features

### 1. **Big Team Score Display**
- Massive, color-coded team average (0-100 scale)
- Real-time trend arrow showing improvement/decline
- 95% confidence intervals for statistical rigor
- Professional color scheme:
  - 🟢 Green: ≥80 (Excellent Chemistry)
  - 🟠 Orange: 60-79 (Good Chemistry)
  - 🔴 Red: <60 (Needs Attention)

### 2. **Chemistry Dimension Breakdown**
Shows team averages for **7 key dimensions**:
- Collective Efficacy
- Task Cohesion
- Role Clarity
- Trust Between Teammates
- Psychological Safety
- Energy
- Communication Quality

Each dimension includes:
- Color-coded score
- 95% confidence interval
- Margin of error
- Visual progress bar with CI indicators

### 3. **Statistical Rigor**
- 95% confidence intervals (α = 0.05)
- Sample size (n) clearly displayed
- Margin of error calculations
- Significance indicators

### 4. **Confidentiality**
- **NO individual player scores shown**
- Only team-level aggregates
- Anonymous, confidential reporting

## Data Structure

Your Google Sheet should have this format:

| Column | Header | Type | Used? |
|--------|--------|------|-------|
| 0 | Player ID | Text | ❌ (Internal only) |
| 1 | Question 1 Answer | Text | ❌ (Skipped) |
| 2 | Collective Efficacy | 1-10 | ✅ |
| 3 | Task Cohesion | 1-10 | ✅ |
| 4 | Role clarity | 1-10 | ✅ |
| 5 | Trust between teammates | 1-10 | ✅ |
| 6 | Psychological safety | 1-10 | ✅ |
| 7 | Energy | 1-10 | ✅ |
| 8 | Communication quality | 1-10 | ✅ |
| 9 | Question 7 Answer | Text | ❌ (Skipped) |
| 10 | Total Score | Number | ❌ (We calculate our own) |

**Note**: Scores are automatically converted from 1-10 scale to 0-100 scale (multiplied by 10)

## Running the Dashboard

You need **two servers** running simultaneously:

### Terminal 1: Backend Server
```bash
npm run server
```
Runs on: `http://localhost:3001`

### Terminal 2: Frontend Dashboard
```bash
npm run dev
```
Runs on: `http://localhost:3000`

## What You'll See

### Main Screen
1. **Header**: "Team Chemistry Report - Confidential"
2. **Big Score Card**:
   - Huge team average number (e.g., "65.2")
   - Color-coded based on score
   - Trend arrow (↑ or ↓) if score changed
   - 95% CI displayed below
   - Progress bar visualization

3. **Dimension Breakdown**:
   - 7 rows, one for each chemistry dimension
   - Each shows: Name, Average, CI, Progress bar
   - Color-coded for quick assessment

4. **Methodology Note**:
   - Explains calculation method
   - Confirms confidentiality
   - Shows color coding legend

## Technical Details

### Confidence Interval Calculation
```
Standard Error = σ / √n
Margin of Error = 1.96 × SE  (for 95% CI)
CI = [mean - ME, mean + ME]
```

### Color Thresholds
- Green: score >= 80
- Orange: 60 <= score < 80
- Red: score < 60

### Data Flow
1. Google Sheets (source data)
2. Backend API (fetches via service account)
3. Data transformation (converts 1-10 to 0-100)
4. Calculate team aggregates
5. Display professional visualizations

## Configuration

Environment variables in `.env`:

```env
# Google Sheets
VITE_GOOGLE_SHEET_ID=your-sheet-id
VITE_GOOGLE_CREDENTIALS_PATH=./credentials.json

# Backend
VITE_BACKEND_URL=http://localhost:3001

# Settings
VITE_POLLING_INTERVAL=5000  # 5 second refresh
VITE_THRESHOLD_HIGH=80
VITE_THRESHOLD_MEDIUM=60
```

## Professional Use

This dashboard is designed for:
- **Team coaches**: Monitor overall team health
- **Sports psychologists**: Track chemistry trends
- **Team managers**: Make data-driven decisions
- **Research**: Analyze team dynamics

## Privacy & Ethics

✅ **Maintains confidentiality**
✅ **No individual scores shown**
✅ **Statistical aggregation only**
✅ **Professional presentation**
✅ **95% confidence reporting**

## Browser Access

Once both servers are running, open:
```
http://localhost:3000
```

The dashboard will:
- Load team data automatically
- Refresh every 5 seconds
- Show real-time updates
- Display trend arrows when data changes

## Troubleshooting

### No data showing
- Ensure both servers are running
- Check backend: `curl http://localhost:3001/api/sheets`
- Verify Google Sheet has data in correct format

### Scores look wrong
- Confirm columns 2-8 have numeric values (1-10)
- Check that text columns are in positions 1 and 9
- Verify service account has access to sheet

### Confidence intervals too wide
- Need larger sample size (more players)
- Check for outliers in data
- Ensure consistent scoring

## Next Steps

### For Production:
1. Deploy backend to cloud service
2. Update `VITE_BACKEND_URL` to production URL
3. Deploy frontend to hosting platform
4. Set environment variables in hosting config

### For Analysis:
1. Export dashboard as PDF for reports
2. Track trends over time
3. Compare dimensions
4. Identify areas for improvement

---

**Built with statistical rigor and professional confidentiality** 📊🔒
