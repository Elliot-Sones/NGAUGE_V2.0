# Column Mapping Verification

This document shows how your Google Sheet columns map to dimension names and calculations.

## Current Mapping (defined in `src/services/dataService.js`)

### Sheet Structure Expected by Code:
```
Column 0: Timestamp
Column 1: Q1 - "How do you feel the week went?" (TEXT - sent to LLM)
Column 2: Q2 - Collective Efficacy (NUMERIC 1-7 → converted to 0-100)
Column 3: Q3 - Task Cohesion (NUMERIC 1-7 → converted to 0-100)
Column 4: Q4 - Role Clarity (NUMERIC 1-7 → converted to 0-100)
Column 5: Q5 - Trust (NUMERIC 1-7 → converted to 0-100)
Column 6: Q6 - Psychological Safety (NUMERIC 1-7 → converted to 0-100)
Column 7: Q7 - Communication Quality (NUMERIC 1-7 → converted to 0-100)
Column 8: Q8 - Energy/Motivation (NUMERIC 1-7 → converted to 0-100)
Column 9: Q9 - "Additional comments" (TEXT - sent to LLM)
```

### Hardcoded Dimension Names (lines 130-138):
These are the labels shown in the FINDINGS section of your dashboard:
1. `Collective Efficacy` (from Column 2)
2. `Task Cohesion` (from Column 3)
3. `Role Clarity` (from Column 4)
4. `Trust` (from Column 5)
5. `Psychological Safety` (from Column 6)
6. `Communication Quality` (from Column 7)
7. `Energy/Motivation` (from Column 8)

## Scale Conversion Formula

```javascript
// Current formula (line 117):
converted_score = ((raw_score - 1) / 6) * 100

// Examples:
// 1 → 0%
// 4 → 50%
// 7 → 100%
```

## Data Flow to LLM

### Score Explanation Prompt
Located in `src/services/geminiService.js` lines 85-112:
- Receives: `weeklyScore` (team average), `overallAverage`, `gameInfo`
- Does NOT receive individual dimension breakdowns
- Does NOT receive raw text responses from Q1/Q9

### Things to Look Out For Prompt
Located in `src/services/geminiService.js` lines 150-208:
- Receives: Array of player response objects
- Extracts: `question1Answer` (Column 1) and `question7Answer` (Column 9)
- Note: `question7Answer` is actually Q9 from Column 9 (line 158)

## Potential Issues to Check

### 1. Verify Your Sheet Column Order
Open your "Weekly-Chemistry" sheet and verify:
- [ ] Column 0 = Timestamp
- [ ] Column 1 = Text question (feelings about week)
- [ ] Columns 2-8 = Numeric ratings (1-7 scale)
- [ ] Column 9 = Additional comments (text)

### 2. Verify Question-to-Dimension Mapping
Check that your Google Form questions map to these dimensions in this exact order:
- [ ] Q2 should measure "Collective Efficacy"
- [ ] Q3 should measure "Task Cohesion"
- [ ] Q4 should measure "Role Clarity"
- [ ] Q5 should measure "Trust"
- [ ] Q6 should measure "Psychological Safety"
- [ ] Q7 should measure "Communication Quality"
- [ ] Q8 should measure "Energy/Motivation"

### 3. Verify Scale (1-7 vs 1-6 vs 1-10)
Check your Google Form:
- [ ] All numeric questions use 1-7 scale
- If NOT 1-7, the conversion formula needs updating

### 4. Verify Text Questions Reach LLM
Check browser console logs when AI generates:
- [ ] Look for logs showing `question1Answer` and `question7Answer` content
- [ ] Verify they contain actual text responses from your sheet

## How to Fix Mismatches

### If column order is different:
Update `numericColumns` array at line 103 in `dataService.js`

### If dimension names don't match your intent:
Update the hardcoded array at lines 130-138 in `dataService.js`

### If using different scale (e.g., 1-10):
Update conversion formula at lines 114-119 in `dataService.js`

### If Q9 is in different column:
Update line 148 in `dataService.js` to point to correct column index

## Testing Checklist

1. [ ] Add a test response to your Google Sheet
2. [ ] Refresh the dashboard
3. [ ] Check browser console for data transformation logs
4. [ ] Verify dimension scores match expected conversions
5. [ ] Click "Explain Scores" and verify it uses correct data
6. [ ] Check that text responses appear in "Things to Look Out For"

## Debug Commands

To inspect the transformed data in browser console:
```javascript
// In browser DevTools console:
// 1. Refresh page
// 2. Look for console.log showing transformed player objects
// 3. Each player object should have:
//    - scores: array of 7 numbers (0-100)
//    - questions: array of 7 dimension names
//    - question1Answer: text from Column 1
//    - question7Answer: text from Column 9
```
