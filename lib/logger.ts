/**
 * Logger utility that suppresses output during tests
 */

const isTest = process.env.NODE_ENV === "test";

export const logger = {
  log: (...args: unknown[]) => {
    if (!isTest) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (!isTest) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (!isTest) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (!isTest) {
      console.info(...args);
    }
  },
};
