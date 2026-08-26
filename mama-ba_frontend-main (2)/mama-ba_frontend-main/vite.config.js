import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Mama Ba",
        short_name: "Mama Ba",
        description: "Guided maternal health care for Ghanaian mothers, in your own language.",
        theme_color: "#84250f",
        background_color: "#fdf9f3",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Never cache API calls that carry auth/health data — only the static shell.
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});