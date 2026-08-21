import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      "/api": "http://127.0.0.1:8765",
      "/login": "http://127.0.0.1:8765",
      "/logout": "http://127.0.0.1:8765",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
