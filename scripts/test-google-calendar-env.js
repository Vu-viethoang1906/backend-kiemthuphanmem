#!/usr/bin/env node
/**
 * Script kiểm tra cấu hình Google Calendar
 * Chạy: node scripts/test-google-calendar-env.js
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env file (mặc định)
dotenv.config();

// Nếu có calendar.txt, load thêm (override nếu cần)
const calendarPath = path.resolve(__dirname, '../calendar.txt');
try {
  dotenv.config({ path: calendarPath, override: false });
} catch (err) {
  // Ignore nếu file không tồn tại
}


const checks = [];
let allPassed = true;

// 1. Kiểm tra GOOGLE_CLIENT_ID
function checkClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    checks.push({ name: 'GOOGLE_CLIENT_ID', status: '❌ MISSING', message: 'Chưa được cấu hình' });
    allPassed = false;
    return;
  }
  
  if (!clientId.includes('.apps.googleusercontent.com')) {
    checks.push({ name: 'GOOGLE_CLIENT_ID', status: '❌ INVALID', message: 'Format không đúng' });
    allPassed = false;
    return;
  }
  
  checks.push({ name: 'GOOGLE_CLIENT_ID', status: '✅ OK', message: clientId });
}

// 2. Kiểm tra GOOGLE_CLIENT_SECRET
function checkClientSecret() {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    checks.push({ name: 'GOOGLE_CLIENT_SECRET', status: '❌ MISSING', message: 'Chưa được cấu hình' });
    allPassed = false;
    return;
  }
  
  if (secret.length < 10) {
    checks.push({ name: 'GOOGLE_CLIENT_SECRET', status: '⚠️  WEAK', message: 'Secret quá ngắn' });
    allPassed = false;
    return;
  }
  
  checks.push({ name: 'GOOGLE_CLIENT_SECRET', status: '✅ OK', message: `${secret.substring(0, 10)}...` });
}

// 3. Kiểm tra GOOGLE_REDIRECT_URI
function checkRedirectUri() {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    checks.push({ name: 'GOOGLE_REDIRECT_URI', status: '❌ MISSING', message: 'Chưa được cấu hình' });
    allPassed = false;
    return;
  }
  
  // Kiểm tra format
  if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
    checks.push({ name: 'GOOGLE_REDIRECT_URI', status: '❌ INVALID', message: 'Phải bắt đầu bằng http:// hoặc https://' });
    allPassed = false;
    return;
  }
  
  // Kiểm tra port backend (3005)
  if (redirectUri.includes('localhost') && !redirectUri.includes(':3005')) {
    checks.push({ name: 'GOOGLE_REDIRECT_URI', status: '⚠️  WARNING', message: 'Port có thể sai (nên là 3005 cho backend)' });
  }
  
  // Kiểm tra path
  if (!redirectUri.includes('/api/calendar/auth/callback')) {
    checks.push({ name: 'GOOGLE_REDIRECT_URI', status: '⚠️  WARNING', message: 'Path có thể sai' });
  }
  
  checks.push({ name: 'GOOGLE_REDIRECT_URI', status: '✅ OK', message: redirectUri });
}

// 4. Kiểm tra GOOGLE_ENCRYPTION_KEY
function checkEncryptionKey() {
  const key = process.env.GOOGLE_ENCRYPTION_KEY;
  if (!key) {
    checks.push({ name: 'GOOGLE_ENCRYPTION_KEY', status: '⚠️  OPTIONAL', message: 'Không có - sẽ tự generate (tokens không decrypt được sau restart)' });
    return;
  }
  
  // Kiểm tra độ dài (nên là 64 ký tự hex)
  if (key.length !== 64) {
    checks.push({ name: 'GOOGLE_ENCRYPTION_KEY', status: '⚠️  WARNING', message: `Độ dài ${key.length}, nên là 64 ký tự hex` });
    return;
  }
  
  // Kiểm tra format hex
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    checks.push({ name: 'GOOGLE_ENCRYPTION_KEY', status: '⚠️  WARNING', message: 'Không phải hex string hợp lệ' });
    return;
  }
  
  checks.push({ name: 'GOOGLE_ENCRYPTION_KEY', status: '✅ OK', message: `${key.substring(0, 16)}...` });
}

// 5. Kiểm tra FRONTEND_URL
function checkFrontendUrl() {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    checks.push({ name: 'FRONTEND_URL', status: '⚠️  OPTIONAL', message: 'Không có - link trong calendar event sẽ rỗng' });
    return;
  }
  
  if (!frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
    checks.push({ name: 'FRONTEND_URL', status: '⚠️  WARNING', message: 'Format không đúng' });
    return;
  }
  
  checks.push({ name: 'FRONTEND_URL', status: '✅ OK', message: frontendUrl });
}

// 6. Kiểm tra OAuth2 Client có khởi tạo được không
function checkOAuth2Client() {
  try {
    const googleCalendarService = require('../services/googleCalendar.service');
    const authUrl = googleCalendarService.getAuthUrl();
    
    if (!authUrl) {
      checks.push({ name: 'OAuth2 Client', status: '❌ FAILED', message: 'Không thể tạo auth URL' });
      allPassed = false;
      return;
    }
    
    if (!authUrl.includes('accounts.google.com')) {
      checks.push({ name: 'OAuth2 Client', status: '❌ INVALID', message: 'Auth URL không hợp lệ' });
      allPassed = false;
      return;
    }
    
    checks.push({ name: 'OAuth2 Client', status: '✅ OK', message: 'Khởi tạo thành công' });
  } catch (error) {
    checks.push({ name: 'OAuth2 Client', status: '❌ ERROR', message: error.message });
    allPassed = false;
  }
}

// Chạy tất cả các kiểm tra
checkClientId();
checkClientSecret();
checkRedirectUri();
checkEncryptionKey();
checkFrontendUrl();
checkOAuth2Client();

// In kết quả
checks.forEach(check => {
});

process.exit(allPassed ? 0 : 1);

