import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8888,
    allowedHosts: [
      "hotmart-hotmartjira-dm4rdw-c006a0-69-62-89-150.traefik.me",
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
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
