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
    "src/routes/index.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  clearMocks: true,
};
