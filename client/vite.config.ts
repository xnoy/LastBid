import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Proxy keeps the browser on one origin in development: no CORS dance,
    // and the socket upgrade rides the same connection.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the vendor bundle so a page change does not redownload React.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          realtime: ['socket.io-client'],
        },
      },
    },
  },
});
