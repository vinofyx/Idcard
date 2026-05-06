import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      '/api':    { target: 'http://localhost:5000', changeOrigin: true },
      '/verify': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  // In production Vercel build, VITE_API_URL overrides proxy
  define: {
    __API_URL__: JSON.stringify(
      mode === 'production'
        ? (process.env.VITE_API_URL || '')
        : ''
    ),
  },
}));
