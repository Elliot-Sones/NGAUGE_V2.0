/**
 * Test Script to Verify Google Sheets API Connection
 * This will fetch and print all data from your Google Sheet
 */

import dotenv from 'dotenv';

// Load environment variables
const envConfig = dotenv.config();
const env = envConfig.parsed || {};

const SHEET_ID = env.VITE_GOOGLE_SHEET_ID || process.env.VITE_GOOGLE_SHEET_ID || '13WmxejOq6Lm8xVffSzaXsbFnLkJ-A9a_KREEG0n73-I';
const API_KEY = env.VITE_GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;

async function testGoogleSheetsAPI() {
  console.log('='.repeat(60));
  console.log('TESTING GOOGLE SHEETS API CONNECTION');
  console.log('='.repeat(60));
  console.log();

  // Check if API key exists
  if (!API_KEY || API_KEY.trim() === '') {
    console.log('❌ ERROR: No API key found!');
    console.log('📝 Please add your Google API key to the .env file');
    console.log('   VITE_GOOGLE_API_KEY=your_api_key_here');
    console.log();
    console.log('🔧 To get an API key:');
    console.log('   1. Go to https://console.cloud.google.com/');
    console.log('   2. Enable Google Sheets API');
    console.log('   3. Create credentials > API Key');
    console.log();
    return;
  }

  console.log('✅ API Key found:', API_KEY.substring(0, 10) + '...');
  console.log('📊 Sheet ID:', SHEET_ID);
  console.log();

  // Build the API URL
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${API_KEY}`;

  console.log('🌐 Fetching data from Google Sheets...');
  console.log();

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Request Failed!');
      console.log('Status:', response.status, response.statusText);
      console.log('Error:', errorText);
      console.log();
      console.log('Common Issues:');
      console.log('  • Make sure the Google Sheets API is enabled in Google Cloud Console');
      console.log('  • Verify the API key is correct');
      console.log('  • Check that the Google Sheet is set to "Anyone with the link can view"');
      console.log('  • Ensure the Sheet ID is correct');
      return;
    }

    const data = await response.json();

    if (!data.values || data.values.length === 0) {
      console.log('⚠️  No data found in the sheet');
      return;
    }

    console.log('✅ SUCCESS! Data retrieved from Google Sheets');
    console.log('='.repeat(60));
    console.log();
    console.log('📋 RAW DATA FROM SHEET:');
    console.log('='.repeat(60));
    console.log();

    // Print all rows
    data.values.forEach((row, index) => {
      if (index === 0) {
        console.log('HEADERS (Row 1):');
        console.log('-'.repeat(60));
      } else {
        console.log(`\nPLAYER ${index} (Row ${index + 1}):`);
        console.log('-'.repeat(60));
      }

      row.forEach((cell, cellIndex) => {
        if (index === 0) {
          console.log(`  Column ${cellIndex + 1}: ${cell}`);
        } else {
          console.log(`  ${data.values[0][cellIndex] || `Column ${cellIndex + 1}`}: ${cell}`);
        }
      });
    });

    console.log();
    console.log('='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total rows: ${data.values.length}`);
    console.log(`Headers: ${data.values[0].length} columns`);
    console.log(`Players: ${data.values.length - 1}`);
    console.log();

    // Print formatted table
    console.log('='.repeat(60));
    console.log('📈 FORMATTED TABLE:');
    console.log('='.repeat(60));
    console.log();

    // Print as table
    const headers = data.values[0];
    const maxWidths = headers.map((header, i) => {
      const columnValues = data.values.map(row => (row[i] || '').toString());
      return Math.max(...columnValues.map(v => v.length), header.length);
    });

    // Print header
    const headerRow = headers.map((h, i) => h.padEnd(maxWidths[i])).join(' | ');
    console.log(headerRow);
    console.log('-'.repeat(headerRow.length));

    // Print data rows
    data.values.slice(1).forEach(row => {
      const dataRow = row.map((cell, i) => (cell || '').toString().padEnd(maxWidths[i])).join(' | ');
      console.log(dataRow);
    });

    console.log();
    console.log('='.repeat(60));
    console.log('✅ API TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log();
    console.log('Stack trace:', error.stack);
  }
}

// Run the test
testGoogleSheetsAPI();
