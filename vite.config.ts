import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(import.meta.dirname, 'src/client'),
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, 'src/shared')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      },
      '/api': {
        target: 'http://localhost:3001'
      }
    }
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/client'),
    emptyOutDir: true
  }
});
