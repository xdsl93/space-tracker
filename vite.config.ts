import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'OrbitalTrack - Space Station Tracker 3D & Radio PWA',
        short_name: 'OrbitalTrack',
        description: 'Real-time 3D/2D tracking per ISS e Tiangong (CSS) con telemetria SGP4, passaggi e frequenze radio Doppler.',
        theme_color: '#050814',
        background_color: '#050814',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/celestrak\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'celestrak-tle-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/three-globe\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'earth-textures-cache',
              expiration: {
                maxEntries: 15,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ]
});
