export default {
  testEnvironment: "jsdom",
  transform: {},
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["js"],
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js"],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ["text", "html", "lcov", "json-summary"],
};
