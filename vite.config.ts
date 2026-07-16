import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { afterlightGeocodeDevPlugin } from "./api/_lib/viteGeocodeMiddleware";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig(async ({ mode }) => {
  const plugins = [react(), afterlightGeocodeDevPlugin(), sites()];
  if (!process.env.VITEST && mode === "sites") {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    plugins.push(cloudflare());
  }

  return {
    plugins,
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
  };
});
