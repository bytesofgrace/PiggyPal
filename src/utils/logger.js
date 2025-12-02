// src/utils/logger.js
// Production-safe logging utility

export const logger = {
  log: (...args) => {
    if (__DEV__) {
      console.log(...args);
    }
  },
  
  warn: (...args) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  
  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  debug: (...args) => {
    if (__DEV__) {
      console.log('🐛 DEBUG:', ...args);
    }
  },
  
  info: (...args) => {
    if (__DEV__) {
      console.log('ℹ️ INFO:', ...args);
    }
  }
};

export default logger;