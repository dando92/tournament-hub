import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  envDir: "../../",
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
      },
      "/realtime": {
        target: "ws://127.0.0.1:3003",
        changeOrigin: true,
        ws: true,
        rewrite: (requestPath) => requestPath.replace(/^\/realtime/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
