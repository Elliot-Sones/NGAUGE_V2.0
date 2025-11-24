/**
 * Test Script to Verify Google Sheets API Connection
 * Using Service Account Authentication
 */

import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
const envConfig = dotenv.config();
const env = envConfig.parsed || {};

const SHEET_ID = env.VITE_GOOGLE_SHEET_ID || '13WmxejOq6Lm8xVffSzaXsbFnLkJ-A9a_KREEG0n73-I';
const CREDENTIALS_PATH = env.VITE_GOOGLE_CREDENTIALS_PATH || './regal-state-476817-j3-0ec41d121201.json';

async function testGoogleSheetsAPI() {
  console.log('='.repeat(60));
  console.log('TESTING GOOGLE SHEETS API - SERVICE ACCOUNT');
  console.log('='.repeat(60));
  console.log();

  // Check if credentials file exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log('❌ ERROR: Service account credentials file not found!');
    console.log(`   Looking for: ${CREDENTIALS_PATH}`);
    console.log();
    return;
  }

  console.log('✅ Service account credentials file found');
  console.log('📊 Sheet ID:', SHEET_ID);
  console.log('🔑 Credentials:', CREDENTIALS_PATH);
  console.log();

  try {
    // Read credentials
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    console.log('✅ Credentials loaded successfully');
    console.log('   Service Account Email:', credentials.client_email);
    console.log();

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const authClient = await auth.getClient();
    console.log('✅ Authentication successful');
    console.log();

    // Create sheets API instance
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    console.log('🌐 Fetching data from Google Sheets...');
    console.log();

    // Fetch data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Weekly-Chemistry',
    });

    const data = response.data.values;

    if (!data || data.length === 0) {
      console.log('⚠️  No data found in the sheet');
      console.log();
      console.log('Make sure:');
      console.log('  • The sheet is named "Sheet1" (or update the range)');
      console.log('  • The service account has access to the sheet');
      console.log(`  • Share the sheet with: ${credentials.client_email}`);
      return;
    }

    console.log('✅ SUCCESS! Data retrieved from Google Sheets');
    console.log('='.repeat(60));
    console.log();
    console.log('📋 RAW DATA FROM SHEET:');
    console.log('='.repeat(60));
    console.log();

    // Print all rows
    data.forEach((row, index) => {
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
          console.log(`  ${data[0][cellIndex] || `Column ${cellIndex + 1}`}: ${cell}`);
        }
      });
    });

    console.log();
    console.log('='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total rows: ${data.length}`);
    console.log(`Headers: ${data[0].length} columns`);
    console.log(`Players: ${data.length - 1}`);
    console.log();

    // Print formatted table
    console.log('='.repeat(60));
    console.log('📈 FORMATTED TABLE:');
    console.log('='.repeat(60));
    console.log();

    // Print as table
    const headers = data[0];
    const maxWidths = headers.map((header, i) => {
      const columnValues = data.map(row => (row[i] || '').toString());
      return Math.max(...columnValues.map(v => v.length), header.length);
    });

    // Print header
    const headerRow = headers.map((h, i) => h.padEnd(maxWidths[i])).join(' | ');
    console.log(headerRow);
    console.log('-'.repeat(headerRow.length));

    // Print data rows
    data.slice(1).forEach(row => {
      const dataRow = row.map((cell, i) => (cell || '').toString().padEnd(maxWidths[i])).join(' | ');
      console.log(dataRow);
    });

    console.log();
    console.log('='.repeat(60));
    console.log('✅ API TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log();
    console.log('🎉 Your Google Sheets integration is working!');
    console.log();

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log();

    if (error.code === 403) {
      console.log('⚠️  Permission denied!');
      console.log();
      console.log('The service account needs access to your Google Sheet.');
      console.log('Follow these steps:');
      console.log();
      console.log('1. Open your Google Sheet:');
      console.log(`   https://docs.google.com/spreadsheets/d/${SHEET_ID}`);
      console.log();
      console.log('2. Click "Share" button (top right)');
      console.log();
      console.log('3. Add this email address as a viewer:');

      try {
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
        console.log(`   ${credentials.client_email}`);
      } catch (e) {
        console.log('   (Check your credentials file for client_email)');
      }
      console.log();
      console.log('4. Click "Send" and try again');
      console.log();
    } else {
      console.log('Stack trace:', error.stack);
    }
  }
}

// Run the test
testGoogleSheetsAPI();
