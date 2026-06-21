/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/setup.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupAfterEnv.js"],
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/lib/**/*.js",
    "src/middleware/**/*.js",
    "src/services/notifications.js",
    "src/routes/**/*.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov"],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
      statements: 100,
      branches: 96,
    },
  },
  clearMocks: true,
};
