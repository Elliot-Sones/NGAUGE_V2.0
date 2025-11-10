# Customization Guide

This guide explains exactly where to make changes for common customizations.

## Quick Reference

| What to Change | File to Edit | Function/Section |
|---------------|--------------|------------------|
| Data source | `src/services/dataService.js` | `fetchSheetData()` |
| Calculation method | `src/utils/calculations.js` | `calculateAverageScore()` |
| Color thresholds | `src/config/constants.js` | `THRESHOLDS` |
| Update frequency | `.env` | `VITE_POLLING_INTERVAL` |
| Add insights | `src/utils/calculations.js` | `generateInsights()` |
| Trend sensitivity | `src/config/constants.js` | `TREND_CONFIG.THRESHOLD` |

---

## 1. Changing the Data Source

### From Google Sheets to REST API

**File**: `src/services/dataService.js`

**Find**: `fetchSheetData()` function

**Replace with**:
```javascript
export async function fetchSheetData() {
  const response = await fetch('https://api.example.com/chemistry');
  if (!response.ok) throw new Error('API error');
  const data = await response.json();
  return data; // Ensure it returns 2D array format
}
```

### From Google Sheets to Firebase

```javascript
import { getDatabase, ref, onValue } from 'firebase/database';

export async function fetchSheetData() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const dataRef = ref(db, 'chemistry-data');
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      resolve(data);
    }, reject);
  });
}
```

---

## 2. Changing Calculation Methods

### Add Weighted Averages

**File**: `src/utils/calculations.js`

**Find**: `calculateAverageScore()` function

**Replace with**:
```javascript
export function calculateAverageScore(scores) {
  // Define weights for each question (adjust as needed)
  const weights = [
    1.5,  // Question 1 - Team Communication (more important)
    1.2,  // Question 2 - Trust Level
    1.0,  // Question 3 - Conflict Resolution
    1.3,  // Question 4 - Shared Goals
    1.1   // Question 5 - Support
  ];

  const validScores = scores.filter(s => !isNaN(s));

  const weightedSum = validScores.reduce((sum, score, idx) => {
    const weight = weights[idx] || 1;
    return sum + (score * weight);
  }, 0);

  const totalWeight = weights.slice(0, validScores.length)
    .reduce((sum, w) => sum + w, 0);

  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
```

### Add Custom Formula

```javascript
export function calculateAverageScore(scores) {
  // Example: Emphasize lowest score (weakest link approach)
  const validScores = scores.filter(s => !isNaN(s));
  const average = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
  const min = Math.min(...validScores);

  // 70% average + 30% minimum score
  return Math.round((average * 0.7 + min * 0.3) * 10) / 10;
}
```

---

## 3. Adjusting Color Thresholds

### Method 1: Using Environment Variables

**File**: `.env`

```env
VITE_THRESHOLD_HIGH=85
VITE_THRESHOLD_MEDIUM=70
```

### Method 2: Direct Configuration

**File**: `src/config/constants.js`

```javascript
export const THRESHOLDS = {
  HIGH: 85,    // Green if score >= 85
  MEDIUM: 70   // Orange if score >= 70
  // Red if score < 70
};
```

### Add More Color Levels

**File**: `src/utils/calculations.js`

**Find**: `getScoreColor()` function

```javascript
export function getScoreColor(score) {
  if (score >= 90) return '#059669';      // Excellent - Dark green
  else if (score >= 80) return '#10b981'; // Great - Green
  else if (score >= 70) return '#fbbf24'; // Good - Yellow
  else if (score >= 60) return '#f59e0b'; // Fair - Orange
  else if (score >= 50) return '#f97316'; // Poor - Dark orange
  else return '#ef4444';                   // Critical - Red
}
```

---

## 4. Adding Custom Insights

**File**: `src/utils/calculations.js`

**Find**: `generateInsights()` function

### Example: Low Score Alert

```javascript
export function generateInsights(playerData) {
  const insights = [];
  const { players, teamAverage } = playerData;

  // Team-level insights
  if (teamAverage < 60) {
    insights.push({
      type: 'warning',
      category: 'Team Alert',
      message: `Team chemistry (${teamAverage.toFixed(1)}) is below target`,
      recommendation: 'Schedule team building activities'
    });
  }

  // Individual player insights
  players.forEach(player => {
    const avgScore = calculateAverageScore(player.scores);

    if (avgScore < 50) {
      insights.push({
        type: 'warning',
        category: `Player: ${player.name}`,
        message: 'Significantly low chemistry score',
        recommendation: 'One-on-one coaching session recommended'
      });
    }

    // Check for specific low areas
    player.responses.forEach((response, idx) => {
      if (response.score < 40) {
        insights.push({
          type: 'info',
          category: `${player.name} - ${response.question}`,
          message: `Low score (${response.score}) in this area`,
          recommendation: 'Focus training on this aspect'
        });
      }
    });
  });

  return insights;
}
```

### Example: Trend-based Insights

```javascript
export function generateInsights(playerData) {
  const insights = [];

  // Detect improving players
  playerData.players.forEach(player => {
    const trend = calculateTrend(player.currentScore, player.previousScore);

    if (trend.direction === 'up' && trend.magnitude > 5) {
      insights.push({
        type: 'success',
        category: `${player.name} - Improvement`,
        message: `Score improved by ${trend.change.toFixed(1)} points`,
        recommendation: 'Recognize and reinforce positive behaviors'
      });
    }

    if (trend.direction === 'down' && trend.magnitude > 5) {
      insights.push({
        type: 'warning',
        category: `${player.name} - Decline`,
        message: `Score decreased by ${Math.abs(trend.change).toFixed(1)} points`,
        recommendation: 'Check in with player to identify issues'
      });
    }
  });

  return insights;
}
```

---

## 5. Modifying Update Frequency

### Change Polling Interval

**File**: `.env`

```env
# Update every 3 seconds (faster)
VITE_POLLING_INTERVAL=3000

# Update every 30 seconds (slower, reduces API calls)
VITE_POLLING_INTERVAL=30000
```

### Switch to WebSocket (Real-time)

**File**: `src/hooks/useRealtimeData.js`

Replace the polling logic:

```javascript
export function useRealtimeData() {
  const [data, setData] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    wsRef.current = new WebSocket('wss://your-server.com/chemistry');

    wsRef.current.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData(transformData(newData));
      setLastUpdated(new Date());
    };

    wsRef.current.onerror = (error) => {
      setError('WebSocket error');
      console.error(error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { data, loading, error };
}
```

---

## 6. Changing Trend Sensitivity

**File**: `src/config/constants.js`

```javascript
export const TREND_CONFIG = {
  THRESHOLD: 3,  // Change from 2 to 3 (less sensitive)
  LOOKBACK_PERIODS: 2
};
```

**More sensitive** (show smaller changes):
```javascript
THRESHOLD: 1  // Show trend for ±1 point changes
```

**Less sensitive** (only show big changes):
```javascript
THRESHOLD: 5  // Only show trend for ±5 point changes
```

---

## 7. Customizing the UI

### Change Color Scheme

**File**: `src/config/constants.js`

```javascript
export const COLORS = {
  HIGH: '#00C853',     // Custom green
  MEDIUM: '#FF9800',   // Custom orange
  LOW: '#F44336',      // Custom red
  NEUTRAL: '#9E9E9E'   // Custom gray
};
```

### Modify Card Layout

**File**: `src/components/ScoreCard.jsx`

Adjust the JSX structure to change appearance.

### Change Dashboard Grid

**File**: `src/components/Dashboard.jsx`

Find the grid section:

```javascript
// Current: 3 columns on large screens
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Change to 4 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Change to 2 columns
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

---

## 8. Adding New Features

### Add Export to CSV

**Create new file**: `src/utils/export.js`

```javascript
export function exportToCSV(players) {
  const headers = ['Player', 'Average Score', ...players[0].questions];
  const rows = players.map(player => [
    player.name,
    calculateAverageScore(player.scores),
    ...player.scores
  ]);

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chemistry-report.csv';
  a.click();
}
```

Add button in `Dashboard.jsx`:

```javascript
import { exportToCSV } from '../utils/export';

// In the Dashboard component
<button onClick={() => exportToCSV(data)}>
  Export CSV
</button>
```

---

## Testing Your Changes

After making changes:

1. **Restart dev server**:
```bash
npm run dev
```

2. **Check browser console** for errors

3. **Test with different data** scenarios

4. **Verify calculations** are correct

---

## Need Help?

- Check inline code comments
- Review the main README.md
- Inspect browser console for errors
- Check that environment variables are loaded
