import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 5275,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5275,
    },
  },
});
