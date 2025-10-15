import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // IMPORTANT: React et React-DOM ensemble dans un seul chunk
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Autres grandes librairies
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three';
            }
            if (id.includes('leaflet')) {
              return 'leaflet';
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
            // Tout le reste
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
    include: ['react', 'react-dom', 'react-router-dom', 'idb', '@supabase/supabase-js']
  },
  server: {
    port: 5173,
    host: true
  }
});