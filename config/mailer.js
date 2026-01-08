const nodemailer = require('nodemailer');
const apiKey = require('../services/apiKey.service');

let transporterPromise = null;

async function initTransporter() {
  const resUser = await apiKey.getApiKeyByDescription('email_user');
  const emailUser = resUser ? resUser : process.env.EMAIL_USER || '';

  const resPass = await apiKey.getApiKeyByDescription('email_pass');
  const emailPass = resPass ? resPass.replace(/\s+/g, '') : process.env.EMAIL_PASS || '';

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = initTransporter(); // lưu promise để không tạo nhiều lần
  }
  return transporterPromise;
}

async function sendMail(to, subject, html, attachments = []) {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER || '',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.filename,
        path: att.path,
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    throw err;
  }
}

module.exports = { sendMail };
