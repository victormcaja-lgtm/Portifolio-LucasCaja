import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Coleta apenas testes unitários em src/ e tests/ (E2E do Playwright ficam de fora).
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],
    // Arquivos CSS (globals.css com Tailwind) não são processados nos testes.
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/components/**", "src/content/**"],
      exclude: ["**/*.test.*", "src/test/**", "src/lib/types.ts"],
      reporter: ["text", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
