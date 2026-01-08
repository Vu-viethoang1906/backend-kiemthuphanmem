// tests/setup.js - Jest setup file
const path = require("path");
// Load dotenv for test environment
require("dotenv").config();

// Global test setup
beforeAll(() => {
});

afterAll(() => {
});


if (process.env.SUPPRESS_CONSOLE === "true") {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
