const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

let hasChanges = false;

function removeConsoleStatements(content) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Kiểm tra nếu dòng này bắt đầu với console.*(
    if (/^console\.(log|error|warn|info|debug|trace|table|group|groupEnd|time|timeEnd)\s*\(/.test(trimmedLine)) {
      // Đếm dấu ngoặc để tìm vị trí kết thúc
      let depth = 0;
      let foundStart = false;
      let j = i;
      let skipLine = false;

      while (j < lines.length) {
        const currentLine = lines[j];
        for (let k = 0; k < currentLine.length; k++) {
          const char = currentLine[k];
          if (char === '(') {
            depth++;
            foundStart = true;
          } else if (char === ')') {
            depth--;
            if (foundStart && depth === 0) {
              // Tìm thấy dấu đóng ngoặc cuối cùng
              // Kiểm tra xem có dấu ; sau đó không
              let hasSemicolon = false;
              for (let m = k + 1; m < currentLine.length; m++) {
                if (currentLine[m] === ';') {
                  hasSemicolon = true;
                  break;
                } else if (currentLine[m].trim() !== '') {
                  break;
                }
              }
              // Bỏ qua tất cả các dòng từ i đến j
              i = j + 1;
              skipLine = true;
              break;
            }
          }
        }
        if (skipLine) break;
        j++;
      }

      if (!skipLine) {
        // Nếu không tìm thấy dấu đóng, có thể là lỗi syntax, giữ lại dòng
        result.push(line);
        i++;
      }
    } else {
      result.push(line);
      i++;
    }
  }

  let resultContent = result.join('\n');

  // Xóa các dòng trống thừa (nhiều hơn 2 dòng trống liên tiếp)
  resultContent = resultContent.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return resultContent;
}

files.forEach((file) => {
  if (!fs.existsSync(file) || path.extname(file) !== '.js') {
    return;
  }

  // Bỏ qua file config/db.js - giữ lại console.log
  const normalizedPath = path.normalize(file).replace(/\\/g, '/');
  if (normalizedPath.includes('config/db.js')) {
    return;
  }

  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // Xóa console statements
  content = removeConsoleStatements(content);

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    hasChanges = true;
  }
});

process.exit(0);
