import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiTarget =
  process.env.JARVIS_VITE_PROXY_TARGET ||
  process.env.VITE_API_URL ||
  'http://192.168.20.210:8000';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': { target: apiTarget, changeOrigin: true },
      '/healthz': apiTarget,
      '/readyz': apiTarget,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules/**'],
  },
});
