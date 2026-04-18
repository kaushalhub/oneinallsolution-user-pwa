import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      /** Service worker + manifest in dev so install criteria can be tested on localhost */
      devOptions: { enabled: true },
      includeAssets: ['favicon.png', 'brandlogo.png'],
      manifest: {
        name: 'AO CLEAN',
        short_name: 'AO CLEAN',
        description: 'Pristine spaces, just a tap away.',
        theme_color: '#7c77b9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Match Vite’s hashed bundles plus copied public assets (avoid `ico`/`svg`/`webp` if absent — empty
        // extension groups can make Workbox warn on some setups).
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
      },
    }),
  ],
});
