require('dotenv/config');
const Groq = require('groq-sdk');

const apiType = process.env.AI_API_TYPE || 'groq';
const apiKey = process.env.AI_API_KEY;
const modelName = process.env.AI_MODEL_NAME || 'llama-3.1-8b-instant';

if (!apiKey) {
  console.warn('⚠️  AI_API_KEY chưa được cấu hình trong .env');
} else {
  if (apiType === 'groq' && !apiKey.startsWith('gsk_') && !apiKey.startsWith('ygsk_')) {
    console.warn('⚠️  AI_API_KEY có vẻ không đúng format (nên bắt đầu với gsk_ hoặc ygsk_)');
  } else {
  }
}

console.log(`📌 AI Model: ${modelName} (có thể thay đổi qua AI_MODEL_NAME trong .env)`);

const groq = new Groq({
  apiKey: apiKey || '',
});

module.exports = groq;


