# Clear AIInsights Sheet - Instructions

## Problem Identified
The system is loading **old insights** from the sheet, so it never creates new entries with game info.

## Steps to Fix:

### 1. Clear the Old Data
Go to your Google Sheet and:
1. Open the **AIInsights** tab
2. **Delete all rows EXCEPT the header row** (Row 1)
3. After deletion, you should only have:
   ```
   Row 1: Timestamp | Game Result | Your Score | Opponent Score | Practice Performance (1-10) | Score Explanation | Team Insights Summary
   ```

### 2. Manually Add a Test Row
Add this test data in Row 2:

| Column | Value |
|--------|-------|
| A (Timestamp) | 2025-01-19T10:30:00.000Z |
| B (Game Result) | Win |
| C (Your Score) | 3 |
| D (Opponent Score) | 2 |
| E (Practice Performance) | 8 |
| F (Score Explanation) | This is a test explanation to verify game info is being read correctly. |
| G (Team Insights Summary) | Test summary |

### 3. Refresh the App
1. Go to http://localhost:3002/
2. **Hard refresh** (Cmd+Shift+R or Ctrl+Shift+F5)
3. Open browser console
4. You should see the test data being loaded

### 4. Test New Entry Creation
1. Click the **Refresh button** in the dashboard
2. The GameInfo modal should appear
3. Fill it out with NEW data:
   - Result: Lose
   - Your Score: 1
   - Opponent Score: 4
   - Practice Performance: 5
4. Click Submit
5. Check the console for logs
6. Check Google Sheets - you should now see **Row 3** with the new game info

## Expected Result
After following these steps, you should see:
- Row 1: Headers
- Row 2: Test data (Win, 3-2, Performance 8)
- Row 3: New data from modal (Lose, 1-4, Performance 5)

---

Let me know if you need help with any of these steps!
