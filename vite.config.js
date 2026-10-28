import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA manifest/service-worker (Build Order §9 step 11) — scaffolded now so the plugin
// is wired up. Icons are cropped from the real logo (public/brand/logo.jpeg) — see
// README "Brand & theme" for how they were generated and where the source lives.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' needs the app to show its own "update available" UI and call
      // updateSW(true) — nothing in this app does that, so a new deploy sat installed
      // but inactive until a user fully closed the app (not just refreshed), and every
      // bug fix looked like it hadn't shipped. 'autoUpdate' takes over on the very next
      // load instead.
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-32.png', 'brand/logo-lockup.png'],
      manifest: {
        name: 'NailsByMandisa',
        short_name: 'NailsByMandisa',
        description: 'Book manicures, pedicures, gel, acrylic, polygel and nail art with NailsByMandisa.',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
