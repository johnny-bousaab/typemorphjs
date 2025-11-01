export default {
  testEnvironment: "jsdom",
  transform: {},
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["js"],
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
