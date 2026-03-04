import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', '1.jpg', 'pwa-icons/apple-touch-icon.png'],
        manifest: {
          name: 'Velo Code',
          short_name: 'Velo Code',
          description:
            'Browser-based, mobile-friendly IDE with project workspace, AI, terminal, and extension-driven runners.',
          theme_color: '#16161a',
          background_color: '#16161a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico}'],
          navigateFallback: '/index.html',
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
