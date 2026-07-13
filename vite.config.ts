import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { afterlightGeocodeDevPlugin } from "./api/_lib/viteGeocodeMiddleware";

export default defineConfig({
  plugins: [react(), afterlightGeocodeDevPlugin()],
  test: {
    coverage: {
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
