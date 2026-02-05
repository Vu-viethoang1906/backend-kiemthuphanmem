const nodemailer = require('nodemailer');
const apiKey = require('../services/apiKey.service');

let transporterPromise = null;

async function initTransporter() {
  // Prefer DB ApiKey if exists, otherwise fallback to ENV
  let emailUser = '';
  let emailPass = '';

  try {
    const resUser = await apiKey.getApiKeyByDescription('email_user');
    emailUser = (resUser || '').toString();
  } catch {
    emailUser = (process.env.EMAIL_USER || '').toString();
  }

  try {
    const resPass = await apiKey.getApiKeyByDescription('email_pass');
    emailPass = (resPass || '').toString().replace(/\s+/g, '');
  } catch {
    emailPass = (process.env.EMAIL_PASS || '').toString().replace(/\s+/g, '');
  }

  if (!emailUser || !emailPass) {
    throw new Error(
      "Thiếu cấu hình email. Vui lòng set EMAIL_USER và EMAIL_PASS trong .env (hoặc tạo ApiKey email_user/email_pass)."
    );
  }

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
    const fromEmail = (process.env.EMAIL_USER || '').toString();

    const mailOptions = {
      from: fromEmail,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      // Support either { filename, path } or { filename, content }
      mailOptions.attachments = attachments.map((att) => {
        const a = { filename: att.filename };
        if (att.content) a.content = att.content;
        else if (att.path) a.path = att.path;
        return a;
      });
    }

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    throw err;
  }
}

module.exports = { sendMail };
