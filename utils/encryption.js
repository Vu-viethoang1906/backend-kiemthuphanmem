const crypto = require("crypto");

const ENCRYPTION_KEY =
  process.env.GOOGLE_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-cbc";

function getKey() {
  if (ENCRYPTION_KEY.length === 64) {
    return Buffer.from(ENCRYPTION_KEY, "hex");
  }
  return crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
}

function encrypt(text) {
  if (!text) return null;

  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;

  try {
    const key = getKey();
    const parts = encryptedText.split(":");
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
