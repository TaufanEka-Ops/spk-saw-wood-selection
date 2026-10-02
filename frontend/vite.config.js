import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // The original build called http://localhost:5000 from five different
    // components. A dev proxy keeps the browser same-origin and removes the
    // hard-coded host from the source entirely.
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
      "/health": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
});
