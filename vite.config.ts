import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Renderer build. In development the UI runs in a browser (or in Electron via
 * WYRMREST_DEV_SERVER) and reaches the service through /api, proxied to the
 * Node process; in the packaged app the same code talks over IPC instead.
 */
export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // The preview is served through a generated hostname, so no host allowlist.
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': {
        target: process.env.WYRMREST_API ?? 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
});
