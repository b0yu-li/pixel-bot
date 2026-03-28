import { defineConfig } from "vitest/config";

/** Runs only `*.smoke.test.ts` (live LLM evals). Use with `npm run test:eval`. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.smoke.test.ts"],
    setupFiles: ["./vitest.smoke.setup.ts"],
    /** LLM round-trips often exceed 5s; local runs have seen 60s+ for a single completion. */
    testTimeout: 120_000,
  },
});
