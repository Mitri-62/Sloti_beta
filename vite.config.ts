import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 5000,
    minify: 'esbuild',
    target: 'esnext',
    rollupOptions: {
      output: {
        // Pas de code splitting - tout dans un seul fichier comme en dev
        inlineDynamicImports: true,
        manualChunks: undefined
      }
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis'
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    port: 5173,
    host: true
  }
});