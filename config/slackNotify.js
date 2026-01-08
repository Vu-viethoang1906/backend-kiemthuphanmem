// /config/slackNotify.js
const axios = require("axios");

async function sendSlackMessage(message) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("❌ SLACK_WEBHOOK_URL không tồn tại trong .env");
      return;
    }

    await axios.post(webhookUrl, {
      text: message,
    });
  } catch (err) {
    console.error("❌ Lỗi gửi thông báo Slack:", err.message);
  }
}

module.exports = { sendSlackMessage };
