import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    // Utiliser esbuild au lieu de terser (plus rapide et déjà inclus)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three';
            }
            if (id.includes('leaflet')) {
              return 'leaflet';
            }
            if (id.includes('react-dom')) {
              return 'react-dom';
            }
            if (id.includes('react') && !id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('react-router-dom')) {
              return 'react-router';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('lucide-react') || id.includes('sonner')) {
              return 'ui-vendor';
            }
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  define: {
    'process.env': {}
  },
  optimizeDeps: {
    include: ['idb', '@supabase/supabase-js', 'react', 'react-dom', 'react-router-dom']
  },
  server: {
    port: 5173,
    host: true
  }
});