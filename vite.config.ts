import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/pyramids/' : '/',
  plugins: [react(), VitePWA({
    strategies: 'generateSW',
    registerType: 'prompt',
    injectRegister: false, // pwa.ts owns registration and explicit update consent.
    scope: '/pyramids/',
    includeManifestIcons: false,
    manifest: {
      id: '/pyramids/', start_url: '/pyramids/', scope: '/pyramids/',
      name: 'Пирамидки', short_name: 'Пирамидки', lang: 'ru',
      description: 'Перенесите пирамидку с первого стержня на последний — ход за ходом.',
      display: 'standalone', theme_color: '#f7f8f3', background_color: '#f7f8f3',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      cacheId: 'pyramids',
      globPatterns: ['**/*.{js,css,html,png,svg}'],
      navigateFallback: 'index.html',
      navigateFallbackAllowlist: [/^\/pyramids(?:\/|$)/],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: false,
    },
    devOptions: { enabled: false },
  })],
  test: { include: ['src/**/*.test.ts'] },
}));
