/**
 * Utility functions để parse @mentions từ comment content
 */

/**
 * Parse @mentions từ content text
 * Format: @username hoặc @full_name
 * Returns: Array of { username, full_name, userId } objects
 */
function parseMentions(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // Regex để match @username hoặc @full_name
  // Format: @username hoặc @full_name (có thể có khoảng trắng trong full_name)
  const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
  const mentions = [];
  const seen = new Set();

  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionText = match[1].trim();
    if (!seen.has(mentionText.toLowerCase())) {
      seen.add(mentionText.toLowerCase());
      mentions.push({
        text: mentionText,
        fullMatch: match[0], // Bao gồm cả @
      });
    }
  }

  return mentions;
}

/**
 * Resolve mentions thành user IDs
 * @param {Array} mentions - Array of mention objects từ parseMentions
 * @param {Array} availableUsers - Array of user objects với username và full_name
 * @returns {Array} Array of user IDs
 */
function resolveMentionsToUserIds(mentions, availableUsers) {
  if (!mentions || mentions.length === 0 || !availableUsers || availableUsers.length === 0) {
    return [];
  }

  const userIds = [];
  const seen = new Set();

  for (const mention of mentions) {
    const mentionText = mention.text.toLowerCase();

    // Tìm user theo username hoặc full_name
    const user = availableUsers.find(u => {
      const username = (u.username || '').toLowerCase();
      const fullName = (u.full_name || '').toLowerCase();
      return username === mentionText || fullName === mentionText;
    });

    if (user && user._id) {
      const userId = user._id.toString();
      if (!seen.has(userId)) {
        seen.add(userId);
        userIds.push(userId);
      }
    }
  }

  return userIds;
}

/**
 * Replace @mentions trong content với formatted HTML/text
 * @param {string} content - Original content
 * @param {Array} users - Array of user objects đã được mention
 * @param {boolean} html - Nếu true, trả về HTML format, nếu false trả về plain text với markers
 * @returns {string} Formatted content
 */
function formatMentionsInContent(content, users, html = false) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let formattedContent = content;

  if (html) {
    // HTML format: @username -> <span class="mention">@username</span>
    users.forEach(user => {
      const username = user.username || '';
      const fullName = user.full_name || '';
      const regex = new RegExp(`@(${username}|${fullName})`, 'gi');
      formattedContent = formattedContent.replace(
        regex,
        `<span class="mention" data-user-id="${user._id}">@${username || fullName}</span>`
      );
    });
  } else {
    // Plain text format: giữ nguyên @username
    // Có thể thêm logic khác nếu cần
  }

  return formattedContent;
}

module.exports = {
  parseMentions,
  resolveMentionsToUserIds,
  formatMentionsInContent,
};
