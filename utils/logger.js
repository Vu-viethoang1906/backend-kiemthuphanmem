/**
 * Simple Logger Utility
 * Provides logging functions: info, warn, error, debug
 */

const logLevel = process.env.LOG_LEVEL || "info";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const shouldLog = (level) => {
  const currentLevel = levels[logLevel.toLowerCase()] || levels.info;
  return levels[level] <= currentLevel;
};

const logger = {
  error: (...args) => {
    if (shouldLog("error")) {
      console.error("❌ [ERROR]", ...args);
    }
  },

  warn: (...args) => {
    if (shouldLog("warn")) {
      console.warn("⚠️  [WARN]", ...args);
    }
  },

  info: (...args) => {
    if (shouldLog("info")) {
    }
  },

  debug: (...args) => {
    if (shouldLog("debug")) {

    }
  },
};

module.exports = logger;
