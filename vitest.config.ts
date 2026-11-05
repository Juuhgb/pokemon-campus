import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Módulo virtual do vite-plugin-pwa: nos testes vira um stub sem service worker.
      'virtual:pwa-register/react': fileURLToPath(new URL('./apps/web/src/test/pwaRegisterStub.ts', import.meta.url)),
    },
  },
  test: {
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
  },
});
