import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'INVICTUS: Celestial Transmutation 3D',
        short_name: 'Invictus 3D',
        description: 'Anime-inspired 3D Mythology x Cyberpunk Action Adventure',
        theme_color: '#070b12',
        background_color: '#070b12',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB to accommodate Babylon.js 3D engine bundle
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 7000
  },
  server: {
    host: true,
    port: 3000
  }
});
