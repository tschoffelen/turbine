import process from "process";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/integration/setup.ts"],
    env: {
      AWS_REGION: process.env.AWS_REGION || "us-east-1",
      TURBINE_TEST_TABLE:
        process.env.TURBINE_TEST_TABLE || "turbine-integration-tests",
    },
  },
});
