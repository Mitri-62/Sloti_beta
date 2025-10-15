import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Désactiver sourcemap pour réduire la mémoire
    sourcemap: false,
    // Augmenter la limite
    chunkSizeWarningLimit: 2000,
    // Optimiser la minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Chunking intelligent basé sur les dépendances
          if (id.includes('node_modules')) {
            // XLSX - très lourd, chunk séparé
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            // Three.js et React Three
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three';
            }
            // Leaflet maps
            if (id.includes('leaflet')) {
              return 'leaflet';
            }
            // React core
            if (id.includes('react-dom')) {
              return 'react-dom';
            }
            if (id.includes('react') && !id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('react-router-dom')) {
              return 'react-router';
            }
            // Charts
            if (id.includes('recharts')) {
              return 'recharts';
            }
            // Framer Motion
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // UI libs
            if (id.includes('lucide-react') || id.includes('sonner')) {
              return 'ui-vendor';
            }
            // Date libs
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Reste des node_modules
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