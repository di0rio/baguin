import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// /api vira same-origin em dev: os cookies de sessão do Better Auth ficam no :5173.
// O Origin do navegador é preservado, então o trustedOrigins do servidor confere.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:2567", changeOrigin: true } },
  },
});
