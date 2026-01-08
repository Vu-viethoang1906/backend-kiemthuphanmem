
const tokenBlacklist = new Set();

// Add token to blacklist
const add = (token) => {
  tokenBlacklist.add(token);
};

// Check if token is blacklisted
const has = (token) => {
  return tokenBlacklist.has(token);
};

// Remove token from blacklist (for testing)
const remove = (token) => {
  tokenBlacklist.delete(token);
};

// Clear all tokens (for testing)
const clear = () => {
  tokenBlacklist.clear();
};

module.exports = {
  add,
  has,
  remove,
  clear
};
