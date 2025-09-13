import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
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
