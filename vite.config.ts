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
  plugins: [react(), {
    name: 'production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      // HMR needs a permissive development policy, but shipped renderers do not.
      return html.replace(/connect-src [^;]+;/, "connect-src 'self';").replace(/script-src [^\"]+/, "script-src 'self'");
    },
  }],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // The preview is served through a generated hostname, so no host allowlist.
    allowedHosts: true,
    // The renderer and API share the preview origin; cross-origin reads of
    // connection settings or data are not needed.
    cors: false,
    proxy: {
      // Regex so we proxy /api/<route> but NOT /api.ts — the renderer's own
      // API-client module is served by Vite as /api.ts; a plain '/api' prefix
      // match (url.startsWith('/api')) swallowed that module request and
      // forwarded it to the API server, which 404s, so the whole app failed
      // to boot in dev / Electron-dev.
      '^/api/': {
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
