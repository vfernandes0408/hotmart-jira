import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: "::",
    port: 8888,
    allowedHosts: [
      "hotmart.vmanager.app",
    ],
    proxy: {
      "/api/jira": {
        target: "https://hotmart.atlassian.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jira/, ""),
        secure: true,
      },
    },
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    include: [
      '@tanstack/react-query',
      '@tanstack/query-sync-storage-persister',
      '@tanstack/react-query-persist-client',
    ],
  },
});
