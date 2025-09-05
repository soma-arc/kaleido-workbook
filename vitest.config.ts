import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: [
            "tests/{acceptance,unit,property,integration}/**/*.{test,spec}.{ts,tsx}",
            "src/**/*.{test,spec}.{ts,tsx}",
        ],
        coverage: {
            provider: "v8",
            reportsDirectory: "./coverage",
        },
    },
});
