import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Adresse und Port entsprechen site_url in supabase/config.toml und PORTAL_URL in .env.
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 5173, strictPort: true },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
