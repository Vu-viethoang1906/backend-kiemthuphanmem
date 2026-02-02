/**
 * Email Validator Utility
 * Chỉ cho phép email có đuôi @gmail.com hoặc @st.cmcu.edu.vn
 */

/**
 * Validate email format - chỉ chấp nhận @gmail.com và @st.cmcu.edu.vn
 * @param {string} email - Email cần validate
 * @returns {boolean} - true nếu email hợp lệ, false nếu không hợp lệ
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmedEmail = email.trim().toLowerCase();

  // Kiểm tra định dạng email cơ bản
  const basicEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!basicEmailRegex.test(trimmedEmail)) {
    return false;
  }

  // Chỉ cho phép 2 đuôi email: @gmail.com và @st.cmcu.edu.vn
  const allowedDomains = ['@gmail.com', '@st.cmcu.edu.vn'];
  const emailDomain = trimmedEmail.substring(trimmedEmail.indexOf('@'));

  return allowedDomains.includes(emailDomain);
}

/**
 * Validate email và throw error nếu không hợp lệ
 * @param {string} email - Email cần validate
 * @param {string} fieldName - Tên field (mặc định: 'Email')
 * @throws {Error} - Nếu email không hợp lệ
 */
function validateEmailOrThrow(email, fieldName = 'Email') {
  if (!email || typeof email !== 'string') {
    throw new Error(`${fieldName} là bắt buộc`);
  }

  if (!validateEmail(email)) {
    throw new Error(
      `${fieldName} không đúng định dạng. Chỉ chấp nhận email có đuôi @gmail.com hoặc @st.cmcu.edu.vn`
    );
  }
}

/**
 * Validate nhiều email (dùng cho danh sách recipients)
 * @param {string[]} emails - Mảng email cần validate
 * @param {string} fieldName - Tên field (mặc định: 'Email')
 * @throws {Error} - Nếu có email không hợp lệ
 */
function validateEmailsOrThrow(emails, fieldName = 'Email') {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error(`Phải có ít nhất một địa chỉ ${fieldName.toLowerCase()}`);
  }

  for (const email of emails) {
    if (!email || typeof email !== 'string') {
      throw new Error(`Địa chỉ ${fieldName.toLowerCase()} không hợp lệ: ${email}`);
    }

    if (!validateEmail(email)) {
      throw new Error(
        `Địa chỉ ${fieldName.toLowerCase()} "${email}" không đúng định dạng. Chỉ chấp nhận email có đuôi @gmail.com hoặc @st.cmcu.edu.vn`
      );
    }
  }
}

module.exports = {
  validateEmail,
  validateEmailOrThrow,
  validateEmailsOrThrow,
};

