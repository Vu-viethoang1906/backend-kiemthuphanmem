const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const path = require('path');

async function readFileData(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.xlsx':
    case '.xls':
      return readExcel(filePath);
    case '.csv':
      return readCSV(filePath);
    case '.json':
      return readJSON(filePath);
    default:
      throw new Error('Unsupported file format!');
  }
}

function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

module.exports = { readFileData };
