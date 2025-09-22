import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
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
