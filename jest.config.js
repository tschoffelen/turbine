import { createDefaultPreset } from "ts-jest";
const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  // Run DynamoDB table setup once before all tests
  globalSetup: "<rootDir>/tests/integration/setup.ts",
  testTimeout: 120000,
  collectCoverageFrom: ["./src/**/*.ts"],
};
