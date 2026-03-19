import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  clearScreen: false,
  server: {
    port: 8300,
    strictPort: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "tone-core": ["tone"],
          "react-vendor": ["react", "react-dom"],
          "zustand-store": ["zustand"],
        },
      },
    },
    chunkSizeWarningLimit: 300,
  },
});
