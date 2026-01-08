const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Tìm tất cả file .js trong project (trừ node_modules, coverage, etc.)
function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Bỏ qua các thư mục không cần thiết
      if (!['node_modules', '.git', 'coverage', 'uploads', '.husky'].includes(file)) {
        findJsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Load script remove-console.js
const removeConsoleScript = path.join(__dirname, 'remove-console.js');

const jsFiles = findJsFiles(process.cwd());

// Chạy script remove-console.js cho từng file
let changedCount = 0;
jsFiles.forEach(file => {
  // Bỏ qua file config/db.js - giữ lại console.log
  const normalizedPath = path.normalize(file).replace(/\\/g, '/');
  if (normalizedPath.includes('config/db.js')) {
    return;
  }

  try {
    const before = fs.readFileSync(file, 'utf8');
    execSync(`node "${removeConsoleScript}" "${file}"`, { stdio: 'ignore' });
    const after = fs.readFileSync(file, 'utf8');

    if (before !== after) {
      changedCount++;
    }
  } catch (error) {
    // Ignore errors
  }
});
