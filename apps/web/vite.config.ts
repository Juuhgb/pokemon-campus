import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

// `npm run dev:phone`: HTTPS na rede local, necessário para o GPS funcionar no celular.
export default defineConfig(({ mode }) => ({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'phone' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['pokemon-campus.svg'],
      manifest: {
        id: '/',
        name: 'Pokémon Campus',
        short_name: 'Pokémon Campus',
        description: 'Explore o campus, descubra criaturas e jogue mesmo sem conexão.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#101827',
        theme_color: '#101827',
        icons: [{ src: 'pokemon-campus.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Guarda apenas os tiles já vistos pelo jogador (sem pré-download em massa, conforme a política do OSM).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));

